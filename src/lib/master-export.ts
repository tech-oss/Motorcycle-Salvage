import * as XLSX from "xlsx";
import { statusMeta } from "@/lib/status";
import { buildSourceRowKeys } from "@/lib/validations/import";
import type { MasterColumn } from "@/lib/master-layout";

/**
 * Rebuilds the client's own MSSA master workbook — not a lookalike export,
 * the actual column layout, in the actual order, with the actual formulas
 * still live so Excel recalculates Outstanding/Profit/TAT columns exactly
 * as it always has. This is what makes the file usable for their existing
 * reporting and insurance/audit requirements instead of a simplified
 * substitute they'd have to rebuild by hand.
 */

/** Shape pulled from salvage_bikes for one row of the export. */
export type MasterExportBike = {
  stock_number: string;
  file_number: string | null;
  claim_number: string | null;
  broker: string | null;
  loss_date: string | null;
  claims_handler: string | null;
  salvage_clerk: string | null;
  make: string | null;
  model: string | null;
  engine_capacity_cc: number | null;
  year: number | null;
  keys_status: string | null;
  vin_number: string | null;
  engine_number: string | null;
  registration_number: string | null;
  write_off_code: string | null;
  retail_value: number | null;
  salvage_value: number | null;
  salvage_percentage: number | null;
  mssa_commission: number | null;
  release_fee: number | null;
  estimator_cost: number | null;
  insurance_invoice_no: string | null;
  insurance_amount: number | null;
  /** Negotiated per deal — feeds the "% Amount" formula's rate directly. */
  commission_rate_percent: number | null;
  status: string;
  current_location: string | null;
  arrival_date: string | null;
  date_received: string | null;
  sold_to: string | null;
  selling_amount: number | null;
  notes: string | null;
  insurance_company_name: string | null;
  /** Verbatim original row from Excel import, keyed like buildSourceRowKeys. Null for bikes created directly in the app. */
  source_row: Record<string, string> | null;
};

/** Fields addressable by MasterColumn.dbField. */
function fieldValue(bike: MasterExportBike, field: string): string | number | null {
  switch (field) {
    case "stock_number": return bike.stock_number;
    case "file_number": return bike.file_number;
    case "claim_number": return bike.claim_number;
    case "broker": return bike.broker;
    case "loss_date": return bike.loss_date;
    case "claims_handler": return bike.claims_handler;
    case "salvage_clerk": return bike.salvage_clerk;
    case "make": return bike.make;
    case "model": return bike.model;
    case "engine_capacity_cc": return bike.engine_capacity_cc;
    case "year": return bike.year;
    case "keys_status": return bike.keys_status ? keysLabel(bike.keys_status) : null;
    case "vin_number": return bike.vin_number;
    case "engine_number": return bike.engine_number;
    case "registration_number": return bike.registration_number;
    case "write_off_code": return bike.write_off_code;
    case "retail_value": return bike.retail_value;
    case "salvage_value": return bike.salvage_value;
    case "salvage_percentage": return bike.salvage_percentage;
    case "mssa_commission": return bike.mssa_commission;
    case "release_fee": return bike.release_fee;
    case "estimator_cost": return bike.estimator_cost;
    case "insurance_invoice_no": return bike.insurance_invoice_no;
    case "insurance_amount": return bike.insurance_amount;
    case "status": return statusMeta(bike.status).label;
    case "current_location": return bike.current_location;
    case "arrival_date": return bike.arrival_date;
    case "date_received": return bike.date_received;
    case "sold_to": return bike.sold_to;
    case "selling_amount": return bike.selling_amount;
    case "notes": return bike.notes;
    case "insurance_company": return bike.insurance_company_name;
    default: return null;
  }
}

function keysLabel(v: string): string {
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "TBC";
}

/** Cell address helper, e.g. (0, 2) -> "A3" for a data row starting at Excel row 3. */
function cellRef(colIndex: number, excelRow: number): string {
  return `${XLSX.utils.encode_col(colIndex)}${excelRow}`;
}

const DATA_START_ROW = 3; // matches the source workbook's own layout (rows 1-2 are banner/header)

/** Matches the rate literal in a template like "AB{R}*15%". */
const RATE_PATTERN = /\*\s*\d+(?:\.\d+)?\s*%/;

/**
 * Substitutes the bike's own negotiated rate into a "% Amount"-style
 * formula template, in place of whatever static rate the dominant-pattern
 * extraction found. The rate isn't a column in the source workbook — it's
 * typed directly into each row's formula — so the export has to do the same
 * per row rather than applying one rate to the whole column (confirmed with
 * the client: the rate varies deal to deal with no derivable pattern).
 *
 * Falls back to the template's own rate when the bike has none set, so
 * older bikes without a captured rate still export a formula rather than a
 * blank cell.
 */
function applyCommissionRate(template: string, ratePercent: number | null): string {
  if (ratePercent === null || !RATE_PATTERN.test(template)) return template;
  return template.replace(RATE_PATTERN, `*${ratePercent}%`);
}

/**
 * Builds one worksheet reproducing the client's exact column layout.
 * `bannerText` and `bannerCol` recreate the title banner row so the sheet
 * looks like theirs at a glance, not just structurally.
 */
export function buildMasterSheet(
  columns: MasterColumn[],
  bikes: MasterExportBike[],
  banner: { text: string; col: number }
): XLSX.WorkSheet {
  const headers = columns.map((c) => c.header);
  const sourceKeys = buildSourceRowKeys(headers);

  const ws: XLSX.WorkSheet = {};
  const lastCol = columns.length - 1;
  const lastRow = DATA_START_ROW - 1 + bikes.length;

  // Row 1: banner.
  ws[cellRef(banner.col, 1)] = { t: "s", v: banner.text };

  // Row 2: headers.
  columns.forEach((col) => {
    ws[cellRef(col.index, 2)] = { t: "s", v: col.header };
  });

  // Data rows.
  bikes.forEach((bike, i) => {
    const excelRow = DATA_START_ROW + i;

    columns.forEach((col) => {
      const ref = cellRef(col.index, excelRow);

      if (col.kind === "formula" && col.formula) {
        const withRate = applyCommissionRate(col.formula, bike.commission_rate_percent);
        ws[ref] = { t: "n", f: withRate.replace(/\{R\}/g, String(excelRow)) };
        return;
      }

      if (col.kind === "field" && col.dbField) {
        const value = fieldValue(bike, col.dbField);
        if (value === null || value === "") return; // leave cell empty
        if (typeof value === "number") ws[ref] = { t: "n", v: value };
        else ws[ref] = { t: "s", v: String(value) };
        return;
      }

      // Ledger column: restore the client's own historical value verbatim,
      // if this bike came from an import. Bikes created directly in the
      // platform have no ledger data to restore — the app has no screens
      // for invoice/receipt bookkeeping, so those cells stay blank rather
      // than inventing a value.
      const raw = bike.source_row?.[sourceKeys[col.index]];
      if (raw && raw.trim()) {
        const asNumber = Number(raw.replace(/[, ]/g, ""));
        if (Number.isFinite(asNumber) && /^[\d,.\s-]+$/.test(raw.trim())) {
          ws[ref] = { t: "n", v: asNumber };
        } else {
          ws[ref] = { t: "s", v: raw };
        }
      }
    });
  });

  ws["!ref"] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: Math.max(lastRow, 2) - 1, c: lastCol }
  );

  // Reasonable default width so the file isn't unusable before the client
  // resizes columns themselves — matches roughly what their own file uses.
  ws["!cols"] = columns.map(() => ({ wch: 14 }));

  return ws;
}
