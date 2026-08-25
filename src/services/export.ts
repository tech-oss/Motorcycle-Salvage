import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MasterExportBike } from "@/lib/master-export";

/**
 * Data for the Excel master export. The client's requirement, stated
 * directly: the exported file must be the SAME workbook they've always
 * used — same tabs, same 121/102 columns, same live formulas — because
 * that file is their reporting and insurance/audit record, and a
 * simplified export would mean re-entering data by hand ("double the
 * work"). Column reconstruction lives in lib/master-layout.ts and
 * lib/master-export.ts; this module only fetches the rows.
 */

type Row = Omit<MasterExportBike, "insurance_company_name" | "source_row"> & {
  insurance_companies: { name: string } | null;
  source_row: unknown;
};

const SELECT_COLUMNS =
  "stock_number, file_number, claim_number, broker, loss_date, claims_handler, " +
  "salvage_clerk, make, model, engine_capacity_cc, year, keys_status, vin_number, " +
  "engine_number, registration_number, write_off_code, retail_value, salvage_value, " +
  "salvage_percentage, mssa_commission, release_fee, estimator_cost, " +
  "insurance_invoice_no, insurance_amount, status, current_location, arrival_date, " +
  "date_received, sold_to, selling_amount, notes, source_row, insurance_companies(name)";

/** PostgREST caps a single response, so the export pages through everything. */
const PAGE_SIZE = 1000;

/**
 * The client's master is split by insurer group: "Bryte & Hollard" and
 * "Alpha". A bike with any other insurer (or none) is grouped into
 * "Bryte & Hollard" — it's the general-purpose sheet with the fuller
 * column set, and there is no third tab in the client's own file to route
 * it to instead.
 */
function sheetForInsurer(name: string | null): "Bryte & Hollard" | "Alpha" {
  const n = (name ?? "").toLowerCase();
  if (n.includes("alpha") || n.includes("ium")) return "Alpha";
  return "Bryte & Hollard";
}

export type MasterExportData = {
  sheets: Record<"Bryte & Hollard" | "Alpha", MasterExportBike[]>;
  total: number;
};

export async function getMasterExportData(): Promise<MasterExportData> {
  const supabase = await createClient();
  const sheets: MasterExportData["sheets"] = { "Bryte & Hollard": [], Alpha: [] };
  let total = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("salvage_bikes")
      .select(SELECT_COLUMNS)
      .order("stock_number")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to build export: ${error.message}`);

    const page = (data ?? []) as unknown as Row[];
    for (const row of page) {
      const sheet = sheetForInsurer(row.insurance_companies?.name ?? null);
      sheets[sheet].push({
        ...row,
        insurance_company_name: row.insurance_companies?.name ?? null,
        source_row: (row.source_row as Record<string, string> | null) ?? null,
      });
      total++;
    }

    if (page.length < PAGE_SIZE) break;
  }

  return { sheets, total };
}
