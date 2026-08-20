import { z } from "zod";

/**
 * Columns a client's historical Excel export realistically carries. Not every
 * salvage_bikes column is offered here — FK-only fields (location/transporter
 * ids) and internal workflow fields (assigned_to, audit columns) don't come
 * from a spreadsheet and stay unmapped.
 */
export const IMPORT_TARGET_FIELDS = [
  { value: "stock_number", label: "Stock Number", required: true },
  { value: "file_number", label: "File Number", required: false },
  { value: "claim_number", label: "Claim Number", required: false },
  { value: "insurance_company", label: "Insurance Company", required: false },
  { value: "broker", label: "Broker", required: false },
  { value: "assessor", label: "Assessor", required: false },
  { value: "insured_name", label: "Insured Name", required: false },
  { value: "insured_phone", label: "Insured Phone", required: false },
  { value: "insured_email", label: "Insured Email", required: false },
  { value: "make", label: "Make", required: false },
  { value: "model", label: "Model", required: false },
  { value: "year", label: "Year", required: false },
  { value: "registration_number", label: "Registration Number", required: false },
  { value: "vin_number", label: "VIN Number", required: false },
  { value: "odometer", label: "Odometer (km)", required: false },
  { value: "colour", label: "Colour", required: false },
  { value: "engine_number", label: "Engine Number", required: false },
  { value: "write_off_code", label: "Write-off Code", required: false },
  { value: "loss_date", label: "Loss Date", required: false },
  { value: "retail_value", label: "Retail Value", required: false },
  { value: "salvage_value", label: "Salvage Value", required: false },
  { value: "collection_location", label: "Collection Location", required: false },
  { value: "current_location", label: "Current Location", required: false },
  { value: "date_received", label: "Date Received", required: false },
  { value: "notes", label: "Notes", required: false },
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]["value"];

/** header -> target field, or null/undefined for "do not import". */
export type ColumnMapping = Partial<Record<ImportTargetField, string>>;

const TEXT_FIELDS: ImportTargetField[] = [
  "file_number", "claim_number", "insurance_company", "broker", "assessor",
  "insured_name", "insured_phone", "insured_email", "make", "model",
  "registration_number", "vin_number", "colour", "engine_number",
  "write_off_code", "collection_location", "current_location", "notes",
];
const NUMBER_FIELDS: ImportTargetField[] = [
  "year", "odometer", "retail_value", "salvage_value",
];
const DATE_FIELDS: ImportTargetField[] = ["loss_date", "date_received"];

/** A raw spreadsheet row after mapping headers to target fields, cells as-is. */
export type MappedRow = Partial<Record<ImportTargetField, string>>;

function excelSerialToIsoDate(serial: number): string | null {
  // Excel's epoch is 1899-12-30 (it treats 1900 as a leap year, off by one).
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseDateCell(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return excelSerialToIsoDate(Number(trimmed));
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseNumberCell(value: string): number | null {
  const trimmed = value.trim().replace(/[, ]/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

export type NormalizedRow = {
  stock_number: string;
  file_number: string | null;
  claim_number: string | null;
  insurance_company: string | null;
  broker: string | null;
  assessor: string | null;
  insured_name: string | null;
  insured_phone: string | null;
  insured_email: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  registration_number: string | null;
  vin_number: string | null;
  odometer: number | null;
  colour: string | null;
  engine_number: string | null;
  write_off_code: string | null;
  loss_date: string | null;
  retail_value: number | null;
  salvage_value: number | null;
  collection_location: string | null;
  current_location: string | null;
  date_received: string | null;
  notes: string | null;
};

export type RowValidationResult =
  | { ok: true; row: NormalizedRow }
  | { ok: false; errors: string[] };

/** Applies the column mapping to one spreadsheet row and validates it. */
export function normalizeImportRow(
  cells: MappedRow,
  rowNumber: number
): RowValidationResult {
  const errors: string[] = [];
  const out: Record<string, string | number | null> = {};

  const stockNumber = (cells.stock_number ?? "").trim();
  if (!stockNumber) {
    errors.push(`Row ${rowNumber}: Stock Number is required.`);
  }
  out.stock_number = stockNumber;

  for (const field of TEXT_FIELDS) {
    const raw = cells[field];
    out[field] = raw && raw.trim() ? raw.trim() : null;
  }

  if (out.insured_email && typeof out.insured_email === "string") {
    if (!z.string().email().safeParse(out.insured_email).success) {
      errors.push(`Row ${rowNumber}: Insured Email is not a valid email.`);
      out.insured_email = null;
    }
  }

  for (const field of NUMBER_FIELDS) {
    const raw = cells[field];
    if (!raw || !raw.trim()) {
      out[field] = null;
      continue;
    }
    const n = parseNumberCell(raw);
    if (n === null || Number.isNaN(n)) {
      errors.push(`Row ${rowNumber}: "${raw}" is not a valid number for ${field}.`);
      out[field] = null;
    } else {
      out[field] = n;
    }
  }

  if (typeof out.year === "number" && (out.year < 1900 || out.year > 2100)) {
    errors.push(`Row ${rowNumber}: Year ${out.year} is out of range.`);
  }
  if (typeof out.odometer === "number" && out.odometer < 0) {
    errors.push(`Row ${rowNumber}: Odometer cannot be negative.`);
  }

  for (const field of DATE_FIELDS) {
    const raw = cells[field];
    if (!raw || !raw.trim()) {
      out[field] = null;
      continue;
    }
    const iso = parseDateCell(raw);
    if (!iso) {
      errors.push(`Row ${rowNumber}: "${raw}" is not a valid date for ${field}.`);
      out[field] = null;
    } else {
      out[field] = iso;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, row: out as unknown as NormalizedRow };
}
