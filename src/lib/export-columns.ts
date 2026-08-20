/**
 * Column layout for the Excel master export.
 *
 * Deliberately free of `server-only` so the same definition is used by the
 * export route, and can be exercised directly by round-trip checks — an
 * export whose headers drift from the import's aliases would silently stop
 * re-importing.
 */

/** Their master's column order, which the export reproduces. */
export const EXPORT_COLUMNS = [
  "Stock No",
  "File Number",
  "Claim No",
  "Insurance Company",
  "Broker",
  "Date",
  "Claims Handler",
  "Salvage Clerk",
  "Make",
  "Model",
  "CC",
  "Year",
  "Keys",
  "Vin Number",
  "Engine Number",
  "Number Plate",
  "Write Off code",
  "Retail",
  "Salvage Value",
  "% Amount",
  "Commision",
  "Release Fee",
  "Transport",
  "Insurance Inv No",
  "Insurance Amount",
  "Status",
  "Store",
  "Arrival Date",
  "Date Received",
  "Sold To",
  "Selling Amount",
  "Remarks",
] as const;

export type ExportBike = Record<string, string | number | null>;

export const KEYS_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
  tbc: "TBC",
};

/**
 * The client's master is split by insurer group: "Bryte & Hollard" and
 * "Alpha". Anything else lands on "Other" rather than being dropped, so the
 * export always totals the full fleet.
 */
export function sheetForInsurer(name: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("alpha") || n.includes("ium")) return "Alpha";
  if (n.includes("bryte") || n.includes("hollard")) return "Bryte & Hollard";
  return "Other";
}

/** Stable tab order so the file looks the same every month; "Other" last. */
export const SHEET_ORDER = ["Bryte & Hollard", "Alpha", "Other"];

/** Shape the export reads out of the database. */
export type ExportSourceRow = {
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
  status: string;
  current_location: string | null;
  arrival_date: string | null;
  date_received: string | null;
  sold_to: string | null;
  selling_amount: number | null;
  notes: string | null;
  insurance_company_name: string | null;
};

/** Maps one database row onto the client's column names. */
export function toExportRow(
  r: ExportSourceRow,
  statusLabel: (code: string) => string
): ExportBike {
  return {
    "Stock No": r.stock_number,
    "File Number": r.file_number,
    "Claim No": r.claim_number,
    "Insurance Company": r.insurance_company_name,
    Broker: r.broker,
    Date: r.loss_date,
    "Claims Handler": r.claims_handler,
    "Salvage Clerk": r.salvage_clerk,
    Make: r.make,
    Model: r.model,
    CC: r.engine_capacity_cc,
    Year: r.year,
    Keys: r.keys_status ? (KEYS_LABEL[r.keys_status] ?? r.keys_status) : null,
    "Vin Number": r.vin_number,
    "Engine Number": r.engine_number,
    "Number Plate": r.registration_number,
    "Write Off code": r.write_off_code,
    Retail: r.retail_value,
    "Salvage Value": r.salvage_value,
    "% Amount": r.salvage_percentage,
    Commision: r.mssa_commission,
    "Release Fee": r.release_fee,
    Transport: r.estimator_cost,
    "Insurance Inv No": r.insurance_invoice_no,
    "Insurance Amount": r.insurance_amount,
    Status: statusLabel(r.status),
    Store: r.current_location,
    "Arrival Date": r.arrival_date,
    "Date Received": r.date_received,
    "Sold To": r.sold_to,
    "Selling Amount": r.selling_amount,
    Remarks: r.notes,
  };
}
