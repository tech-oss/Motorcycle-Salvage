import { z } from "zod";

/**
 * Import parsing for the client's real MSSA master workbook.
 *
 * The shapes here are driven by the actual file, not a tidy template: header
 * rows sit below a title banner, money arrives as " 56,521.74 " or " -   ",
 * dates as "15-Nov-18" or "Nov-18", and the two worksheets ("Bryte & Hollard"
 * and "Alpha") carry different column sets. Everything below exists because a
 * real cell in that workbook broke a simpler assumption.
 */

export const IMPORT_TARGET_FIELDS = [
  // Identification
  { value: "stock_number", label: "Stock Number", required: true },
  { value: "file_number", label: "File Number", required: false },
  { value: "claim_number", label: "Claim Number", required: false },
  { value: "status", label: "Status", required: false },

  // Insurance
  { value: "insurance_company", label: "Insurance Company", required: false },
  { value: "broker", label: "Broker", required: false },
  { value: "assessor", label: "Assessor", required: false },
  { value: "claims_handler", label: "Claims Handler", required: false },
  { value: "salvage_clerk", label: "Salvage Clerk", required: false },
  { value: "insured_name", label: "Insured Name", required: false },
  { value: "insured_phone", label: "Insured Phone", required: false },
  { value: "insured_email", label: "Insured Email", required: false },

  // Motorcycle
  { value: "make", label: "Make", required: false },
  { value: "model", label: "Model", required: false },
  { value: "engine_capacity_cc", label: "CC (engine capacity)", required: false },
  { value: "year", label: "Year", required: false },
  { value: "registration_number", label: "Registration / Number Plate", required: false },
  { value: "vin_number", label: "VIN Number", required: false },
  { value: "engine_number", label: "Engine Number", required: false },
  { value: "odometer", label: "Odometer (km)", required: false },
  { value: "colour", label: "Colour", required: false },
  { value: "keys_status", label: "Keys", required: false },
  { value: "write_off_code", label: "Write-off Code", required: false },
  { value: "loss_date", label: "Loss Date", required: false },

  // Location
  { value: "collection_location", label: "Collection Location", required: false },
  { value: "current_location", label: "Store / Current Location", required: false },
  { value: "arrival_date", label: "Arrival Date", required: false },
  { value: "date_received", label: "Date Received", required: false },

  // Financial
  { value: "retail_value", label: "Retail Value", required: false },
  { value: "salvage_value", label: "Salvage Value", required: false },
  { value: "salvage_percentage", label: "Salvage %", required: false },
  { value: "mssa_commission", label: "Commission", required: false },
  { value: "release_fee", label: "Release Fee", required: false },
  { value: "release_payment_date", label: "Release Payment Date", required: false },
  { value: "estimator_cost", label: "Transport Cost", required: false },
  { value: "sold_to", label: "Sold To", required: false },
  { value: "selling_amount", label: "Selling Amount", required: false },
  { value: "insurance_invoice_no", label: "Insurance Invoice No", required: false },
  { value: "insurance_amount", label: "Insurance Amount", required: false },

  // Free text
  { value: "notes", label: "Remarks / Notes", required: false },
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]["value"];

/**
 * Header spellings seen in the client's workbook, mapped to our fields.
 * Their headers are inconsistent ("Stock No", "Number Plate ", "Commision"),
 * so exact/substring guessing alone mis-maps the most important columns —
 * "Stock No" in particular is not a substring of "stock_number".
 */
const HEADER_ALIASES: Record<string, ImportTargetField> = {
  "stock no": "stock_number",
  "stockno": "stock_number",
  "stock number": "stock_number",
  "cost code": "stock_number",
  "file": "file_number",
  "file no": "file_number",
  "file number": "file_number",
  "claim no": "claim_number",
  "claim number": "claim_number",
  "insurance company": "insurance_company",
  "insurance": "insurance_company",
  "broker": "broker",
  "assessor": "assessor",
  "claims handler": "claims_handler",
  "salvage clerk": "salvage_clerk",
  "mssa clerck": "salvage_clerk",
  "mssa clerk": "salvage_clerk",
  "insured": "insured_name",
  "insured name": "insured_name",
  "make": "make",
  "model": "model",
  "cc": "engine_capacity_cc",
  "year": "year",
  "year of manufacture": "year",
  "number plate": "registration_number",
  "reg no": "registration_number",
  "reg no.": "registration_number",
  "registration": "registration_number",
  "vehicle registration number": "registration_number",
  "vin number": "vin_number",
  "vin no": "vin_number",
  "vin": "vin_number",
  "engine number": "engine_number",
  "km": "odometer",
  "odometer": "odometer",
  "colour": "colour",
  "color": "colour",
  "keys": "keys_status",
  "motorcycle key": "keys_status",
  "write off code": "write_off_code",
  "write-off code": "write_off_code",
  "write-off code reason": "write_off_code",
  "date": "loss_date",
  "date of loss": "loss_date",
  "loss date": "loss_date",
  "date in": "date_received",
  "date received": "date_received",
  "store": "current_location",
  "arrival date": "arrival_date",
  "collect from": "collection_location",
  "collecting from": "collection_location",
  "collection address": "collection_location",
  "retail": "retail_value",
  "retails": "retail_value",
  "retail value": "retail_value",
  "salvage value": "salvage_value",
  // "% Amount" is the rand figure derived from the salvage percentage, not
  // the percentage itself — in both worksheets it equals the insurance amount.
  "% amount": "salvage_value",
  "salvage %": "salvage_percentage",
  "insurance return after comms": "salvage_percentage",
  "commision": "mssa_commission",
  "commission": "mssa_commission",
  "mssa commission": "mssa_commission",
  "release fee": "release_fee",
  "transport": "estimator_cost",
  "sold to": "sold_to",
  "selling amount": "selling_amount",
  "insurance inv no": "insurance_invoice_no",
  "ium inv no": "insurance_invoice_no",
  "insurance amount": "insurance_amount",
  "ium amount": "insurance_amount",
  "status": "status",
  "remarks": "notes",
  "notes": "notes",
};

/** header -> target field, or null/undefined for "do not import". */
export type ColumnMapping = Partial<Record<ImportTargetField, string>>;

/**
 * Best-effort auto-mapping for one header cell. Aliases win over fuzzy
 * matching so the client's own spellings map correctly.
 */
export function guessTargetField(header: string): ImportTargetField | undefined {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, " ").replace(/:$/, "");
  const alias = HEADER_ALIASES[normalized];
  if (alias) return alias;

  const squashed = normalized.replace(/[^a-z0-9]/g, "");
  if (!squashed) return undefined;

  for (const field of IMPORT_TARGET_FIELDS) {
    const label = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    const value = field.value.replace(/_/g, "");
    if (squashed === label || squashed === value) return field.value;
  }

  // Their master has typo'd headers where stray text is appended to a real
  // column name (the Alpha sheet's stock column reads "Stock Nosuzu"). Only
  // the stock number gets this prefix rescue: it is the one column whose
  // absence blocks the entire import, and a broad prefix rule mis-claimed
  // ordinary headers like "Amount" and "Salvage sold TAT".
  if (squashed.startsWith("stockno") || squashed.startsWith("stocknumber")) {
    return "stock_number";
  }
  return undefined;
}

const TEXT_FIELDS = [
  "file_number", "claim_number", "insurance_company", "broker", "assessor",
  "claims_handler", "salvage_clerk", "insured_name", "insured_phone",
  "insured_email", "make", "model", "registration_number", "vin_number",
  "engine_number", "colour", "write_off_code", "collection_location",
  "current_location", "sold_to", "insurance_invoice_no", "notes",
] as const satisfies readonly ImportTargetField[];

const NUMBER_FIELDS = [
  "year", "odometer", "engine_capacity_cc", "retail_value", "salvage_value",
  "salvage_percentage", "mssa_commission", "release_fee", "estimator_cost",
  "selling_amount", "insurance_amount",
] as const satisfies readonly ImportTargetField[];

const DATE_FIELDS = [
  "loss_date", "date_received", "arrival_date", "release_payment_date",
] as const satisfies readonly ImportTargetField[];

/** A raw spreadsheet row after mapping headers to target fields, cells as-is. */
export type MappedRow = Partial<Record<ImportTargetField, string>>;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Two-digit years in this workbook span 2018–2026, so anything at or below
 * the pivot is 2000s. Without this "18" reads as 1918.
 */
function expandYear(raw: string): number {
  const n = Number(raw);
  if (raw.length <= 2) return n <= 69 ? 2000 + n : 1900 + n;
  return n;
}

function excelSerialToIso(serial: number): string | null {
  // Excel's epoch is 1899-12-30 (it treats 1900 as a leap year, off by one).
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (Number.isNaN(d.getTime())) return null;
  // UTC getters: the value was constructed from a UTC epoch offset, so local
  // getters would shift the date across timezones.
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Parses the date spellings the client's workbook actually contains.
 *
 * Deliberately does NOT fall back to `new Date(string)`: that parses
 * "15-Nov-18" as local midnight, and converting the result through
 * toISOString() silently shifted every date back by one day.
 */
export function parseDateCell(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;

  // Excel serial number
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    // A bare 4-digit number in a date column is a year, not a serial.
    if (trimmed.length === 4 && n >= 1900 && n <= 2100) return iso(n, 1, 1);
    return excelSerialToIso(n);
  }

  // 15-Nov-18 / 6-Jun-19 / 15 July 2026 / 15 Nov 2018
  let m = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (month) return iso(expandYear(m[3]), month, Number(m[1]));
  }

  // Nov-18 (month + year only) -> first of that month
  m = trimmed.match(/^([A-Za-z]{3,9})[-/ ](\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase().slice(0, 4)] ?? MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (month) return iso(expandYear(m[2]), month, 1);
  }

  // 2019-03-08 (already ISO)
  m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));

  // 7/3/2019 — day/month/year (South African convention)
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return iso(expandYear(m[3]), month, day);
    }
  }

  // Monday, August 03, 2026
  m = trimmed.match(/^[A-Za-z]+,\s*([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase().slice(0, 4)] ?? MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (month) return iso(Number(m[3]), month, Number(m[2]));
  }

  return null;
}

/**
 * Parses the money/number spellings in the workbook.
 *
 * Returns null for the accounting blanks (" -   ", "", "N/A") rather than
 * NaN — those mean "no value", and treating them as errors rejected
 * thousands of otherwise-good rows.
 */
export function parseNumberCell(value: string): number | null | typeof NaN {
  let t = value.trim();
  if (!t) return null;

  // Accounting blanks and placeholders.
  if (/^[-–—]+$/.test(t) || /^n\/?a$/i.test(t) || t === "#N/A") return null;

  // Trailing/leading currency and percent markers.
  const isPercent = t.endsWith("%");
  if (isPercent) t = t.slice(0, -1).trim();
  t = t.replace(/^R\s*/i, "").replace(/^ZAR\s*/i, "");

  // (1,234.00) is negative in accounting exports.
  let negative = false;
  if (/^\(.*\)$/.test(t)) {
    negative = true;
    t = t.slice(1, -1);
  }

  t = t.replace(/[,\s]/g, "");
  if (!t || t === "-") return null;

  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

/**
 * Maps their free-text status vocabulary onto our workflow codes. Anything
 * unrecognised is left for the caller to keep as a note rather than guessed
 * at — a wrong status is worse than no status.
 */
const STATUS_ALIASES: Record<string, string> = {
  // The master's own vocabulary, seeded as real statuses by migration 007 so
  // an import preserves the client's workflow rather than approximating it.
  "sold": "sold",
  "not sold": "not_sold",
  "no salvage": "no_salvage",
  "ins paid": "received",
  "in transit": "in_transit",
  "parts": "received",
  "new instruction": "new_instruction",
  "upliftment pending": "upliftment_pending",
  "scheduled": "scheduled",
  "received": "received",
  "ready for sale": "ready_for_sale",
  "archived": "archived",
};

export function normalizeStatus(value: string): string | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return STATUS_ALIASES[key] ?? null;
}

/** "Yes"/"NO"/"yES" -> our keys_status enum. */
export function normalizeKeys(value: string): "yes" | "no" | "tbc" | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === "yes" || v === "y") return "yes";
  if (v === "no" || v === "n" || v === "no key") return "no";
  return "tbc";
}

export type NormalizedRow = {
  stock_number: string;
  file_number: string | null;
  claim_number: string | null;
  status: string | null;
  insurance_company: string | null;
  broker: string | null;
  assessor: string | null;
  claims_handler: string | null;
  salvage_clerk: string | null;
  insured_name: string | null;
  insured_phone: string | null;
  insured_email: string | null;
  make: string | null;
  model: string | null;
  engine_capacity_cc: number | null;
  year: number | null;
  registration_number: string | null;
  vin_number: string | null;
  engine_number: string | null;
  odometer: number | null;
  colour: string | null;
  keys_status: "yes" | "no" | "tbc" | null;
  write_off_code: string | null;
  loss_date: string | null;
  collection_location: string | null;
  current_location: string | null;
  arrival_date: string | null;
  date_received: string | null;
  retail_value: number | null;
  salvage_value: number | null;
  salvage_percentage: number | null;
  mssa_commission: number | null;
  release_fee: number | null;
  release_payment_date: string | null;
  estimator_cost: number | null;
  sold_to: string | null;
  selling_amount: number | null;
  insurance_invoice_no: string | null;
  insurance_amount: number | null;
  notes: string | null;
  /** Every original cell, keyed by its header — nothing from the master is lost. */
  source_row: Record<string, string>;
};

export type RowValidationResult =
  | { ok: true; row: NormalizedRow; warnings: string[] }
  | { ok: false; errors: string[] };

/** Applies the column mapping to one spreadsheet row and validates it. */
export function normalizeImportRow(
  cells: MappedRow,
  rowNumber: number,
  sourceRow: Record<string, string> = {}
): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const out: Record<string, unknown> = {};

  const stockNumber = (cells.stock_number ?? "").trim();
  if (!stockNumber) {
    errors.push(`Row ${rowNumber}: Stock Number is required.`);
  }
  out.stock_number = stockNumber;

  for (const field of TEXT_FIELDS) {
    const raw = cells[field];
    out[field] = raw && raw.trim() ? raw.trim() : null;
  }

  if (typeof out.insured_email === "string") {
    if (!z.string().email().safeParse(out.insured_email).success) {
      warnings.push(`Row ${rowNumber}: dropped invalid email ${JSON.stringify(out.insured_email)}.`);
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
    if (n !== null && Number.isNaN(n)) {
      warnings.push(
        `Row ${rowNumber}: ${JSON.stringify(raw.trim())} is not a number for ${field} — left blank.`
      );
      out[field] = null;
    } else {
      out[field] = n;
    }
  }

  // Range guards mirror the CHECK constraints in 001_initial_schema.sql, so a
  // bad cell is reported here instead of failing the whole insert later.
  if (typeof out.year === "number" && (out.year < 1900 || out.year > 2100)) {
    warnings.push(`Row ${rowNumber}: year ${out.year} is out of range — left blank.`);
    out.year = null;
  }
  if (typeof out.odometer === "number" && out.odometer < 0) {
    warnings.push(`Row ${rowNumber}: negative odometer — left blank.`);
    out.odometer = null;
  }
  if (
    typeof out.salvage_percentage === "number" &&
    (out.salvage_percentage < 0 || out.salvage_percentage > 100)
  ) {
    warnings.push(`Row ${rowNumber}: salvage % out of range — left blank.`);
    out.salvage_percentage = null;
  }

  for (const field of DATE_FIELDS) {
    const raw = cells[field];
    if (!raw || !raw.trim()) {
      out[field] = null;
      continue;
    }
    const parsed = parseDateCell(raw);
    if (!parsed) {
      warnings.push(
        `Row ${rowNumber}: ${JSON.stringify(raw.trim())} is not a date for ${field} — left blank.`
      );
      out[field] = null;
    } else {
      out[field] = parsed;
    }
  }

  out.keys_status = cells.keys_status ? normalizeKeys(cells.keys_status) : null;

  if (cells.status && cells.status.trim()) {
    const mapped = normalizeStatus(cells.status);
    if (mapped) {
      out.status = mapped;
    } else {
      out.status = null;
      warnings.push(
        `Row ${rowNumber}: unrecognised status ${JSON.stringify(cells.status.trim())} — kept in notes.`
      );
    }
  } else {
    out.status = null;
  }

  out.source_row = sourceRow;

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, row: out as unknown as NormalizedRow, warnings };
}

/**
 * Builds a unique key per column for `source_row`.
 *
 * The master repeats header names across its invoice blocks — "Paid" appears
 * nine times, "Amount" eight. Keying purely by name collapsed 121 columns into
 * 83 and silently discarded the entire ledger, so repeats carry their column
 * position. The first occurrence keeps the clean name for readability.
 */
export function buildSourceRowKeys(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const name = header.trim();
    if (!name) return `Column ${index + 1}`;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} (col ${index + 1})`;
  });
}

/**
 * Chooses which column feeds each field when several headers claim the same
 * one.
 *
 * The master has "Trade", "Retails" and "Retail" side by side; all three look
 * like a retail value, but only "Retail" is actually populated (987 rows vs
 * 143). Taking the first match silently imported the near-empty column, so
 * the most-populated candidate wins instead.
 */
export function buildAutoMapping(
  headers: string[],
  dataRows: string[][]
): Record<number, ImportTargetField | undefined> {
  const candidates = new Map<ImportTargetField, { index: number; filled: number }[]>();

  headers.forEach((header, index) => {
    const field = guessTargetField(header);
    if (!field) return;
    let filled = 0;
    for (const row of dataRows) {
      if (String(row[index] ?? "").trim()) filled++;
    }
    const list = candidates.get(field) ?? [];
    list.push({ index, filled });
    candidates.set(field, list);
  });

  const mapping: Record<number, ImportTargetField | undefined> = {};
  for (const [field, list] of candidates) {
    // Ties keep the leftmost column, which matches reading order.
    list.sort((a, b) => b.filled - a.filled || a.index - b.index);
    mapping[list[0].index] = field;
  }
  return mapping;
}

/**
 * Finds the real header row. The client's master has a title banner above the
 * headers, so row 1 is not the header row — scoring each candidate by how
 * many cells look like column names is more robust than a fixed index.
 */
export function detectHeaderRow(rows: string[][], searchDepth = 10): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < Math.min(searchDepth, rows.length); i++) {
    const row = rows[i] ?? [];
    const filled = row.filter((c) => String(c ?? "").trim() !== "");
    if (filled.length === 0) continue;

    const recognised = filled.filter((c) => guessTargetField(String(c))).length;
    // Prefer rows that both look like headers and are densely populated; a
    // banner row has one or two long cells and matches nothing.
    const score = recognised * 10 + filled.length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}
