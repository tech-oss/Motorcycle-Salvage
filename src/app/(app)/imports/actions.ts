"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/supabase/auth";
import type { NormalizedRow } from "@/lib/validations/import";

export type DuplicateCheckResult = {
  error?: string;
  /** stock numbers (as submitted) that already exist, case-insensitive. */
  duplicates?: string[];
};

/** Step: "Detect duplicates (by Stock Number)" — PROJECT_SCOPE §19. */
export async function checkDuplicateStockNumbers(
  stockNumbers: string[]
): Promise<DuplicateCheckResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "You do not have permission to import data." };
  }

  const unique = [...new Set(stockNumbers.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return { duplicates: [] };

  const supabase = await createClient();
  const existingLower = await fetchExistingStockNumbers(supabase, unique);
  const duplicates = unique.filter((s) => existingLower.has(s.toLowerCase()));
  return { duplicates };
}

/** How many stock numbers to put in a single `in.(...)` filter. */
const LOOKUP_PAGE = 150;

/**
 * Looks up which of `wanted` already exist, keyed lowercase.
 *
 * Deliberately scoped to the stock numbers being asked about rather than
 * selecting the whole table: PostgREST caps an unbounded select at 1000 rows,
 * so a full-table read silently stopped seeing existing bikes once the fleet
 * passed 1,000 — which is well inside the client's 1,500-row master.
 *
 * Casing in a historical workbook is never reliable, so both the exact value
 * and its lower/upper variants are queried, and the comparison is done
 * case-insensitively on the way out.
 */
async function fetchExistingStockNumbers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wanted: string[]
): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  for (let i = 0; i < wanted.length; i += LOOKUP_PAGE) {
    const page = wanted.slice(i, i + LOOKUP_PAGE);
    const variants = [
      ...new Set(page.flatMap((s) => [s, s.toLowerCase(), s.toUpperCase()])),
    ];
    const { data, error } = await supabase
      .from("salvage_bikes")
      .select("id, stock_number")
      .in("stock_number", variants);

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      found.set(row.stock_number.toLowerCase(), row.id);
    }
  }

  return found;
}

export type ImportRowInput = {
  row: NormalizedRow;
  /** How to handle this row if its stock number already exists. */
  onDuplicate: "skip" | "overwrite";
};

export type BeginImportResult = { error?: string; batchId?: string };

/**
 * Opens an import run.
 *
 * The client's master is ~1,500 rows wide by ~120 columns; sending that in a
 * single Server Action call exceeds the request body limit, so the import is
 * split into a begin / chunk / finalize lifecycle. The batch row also gives
 * every imported bike a traceable origin via salvage_bikes.import_batch_id.
 */
export async function beginImport(
  fileName: string,
  sheetName: string
): Promise<BeginImportResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "You do not have permission to import data." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      file_name: fileName,
      sheet_name: sheetName,
      // Stamped explicitly: import_batches has no set_actor trigger, and an
      // unattributed import is not much of an audit record.
      created_by: profile!.id,
    })
    .select("id")
    .single();

  if (error) return { error: `Could not start the import: ${error.message}` };
  return { batchId: data.id };
}

export type ChunkResult = {
  error?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  duplicates?: number;
  /** Per-row failures, so a partial import can still be explained. */
  failures?: string[];
};

const CHUNK_DB_PAGE = 200;

function buildPayload(
  row: NormalizedRow,
  insurerId: string | null,
  batchId: string
) {
  return {
    stock_number: row.stock_number,
    file_number: row.file_number,
    claim_number: row.claim_number,
    // Always present, never conditionally spread: PostgREST fills a key that
    // is missing from one object in a bulk insert with NULL rather than the
    // column default, so a page mixing rows with and without a status failed
    // the NOT NULL constraint and fell back to 100 single-row inserts.
    status: row.status ?? "new_instruction",
    insurance_company_id: insurerId,
    broker: row.broker,
    assessor: row.assessor,
    claims_handler: row.claims_handler,
    salvage_clerk: row.salvage_clerk,
    insured_name: row.insured_name,
    insured_phone: row.insured_phone,
    insured_email: row.insured_email,
    make: row.make,
    model: row.model,
    engine_capacity_cc: row.engine_capacity_cc,
    year: row.year,
    registration_number: row.registration_number,
    vin_number: row.vin_number,
    engine_number: row.engine_number,
    odometer: row.odometer,
    colour: row.colour,
    keys_status: row.keys_status,
    write_off_code: row.write_off_code,
    loss_date: row.loss_date,
    collection_location: row.collection_location,
    current_location: row.current_location,
    arrival_date: row.arrival_date,
    date_received: row.date_received,
    retail_value: row.retail_value,
    salvage_value: row.salvage_value,
    salvage_percentage: row.salvage_percentage,
    mssa_commission: row.mssa_commission,
    release_fee: row.release_fee,
    release_payment_date: row.release_payment_date,
    estimator_cost: row.estimator_cost,
    sold_to: row.sold_to,
    selling_amount: row.selling_amount,
    insurance_invoice_no: row.insurance_invoice_no,
    insurance_amount: row.insurance_amount,
    notes: row.notes,
    source_row: row.source_row,
    import_batch_id: batchId,
  };
}

/**
 * Imports one chunk of rows. Inserts and updates are issued as bulk pages
 * rather than row-by-row — 1,500 individual round trips would time out long
 * before the import finished.
 */
export async function importChunk(
  batchId: string,
  rows: ImportRowInput[]
): Promise<ChunkResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "You do not have permission to import data." };
  }
  if (rows.length === 0) {
    return { imported: 0, updated: 0, skipped: 0, duplicates: 0, failures: [] };
  }

  const supabase = await createClient();

  // Resolve insurance company names to ids, creating any that don't exist.
  // Historical spreadsheets name insurers and brokerages freely, and refusing
  // a row over an unrecognised insurer would defeat the point of a migration.
  const insurerNames = [
    ...new Set(
      rows.map((r) => r.row.insurance_company).filter((n): n is string => !!n)
    ),
  ];
  const insurerIdByName = new Map<string, string>();
  if (insurerNames.length > 0) {
    // The insurer list is small and bounded, so a full read is fine here —
    // unlike the bike lookup below, it cannot outgrow the row cap.
    const { data: existing, error: existingErr } = await supabase
      .from("insurance_companies")
      .select("id, name");
    if (existingErr) {
      return { error: `Could not load insurance companies: ${existingErr.message}` };
    }
    for (const r of existing ?? []) insurerIdByName.set(r.name.toLowerCase(), r.id);

    const missing = insurerNames.filter((n) => !insurerIdByName.has(n.toLowerCase()));
    if (missing.length > 0) {
      const { data: created, error: createErr } = await supabase
        .from("insurance_companies")
        .insert(missing.map((name) => ({ name })))
        .select("id, name");
      if (createErr) {
        return { error: `Could not create insurance companies: ${createErr.message}` };
      }
      for (const r of created ?? []) insurerIdByName.set(r.name.toLowerCase(), r.id);
    }
  }

  // Only the stock numbers in THIS chunk — reading the whole table here made
  // the import O(n²) and, past 1,000 bikes, silently truncated.
  let existingByStock: Map<string, string>;
  try {
    existingByStock = await fetchExistingStockNumbers(
      supabase,
      rows.map((r) => r.row.stock_number)
    );
  } catch (err) {
    return {
      error: `Could not check existing bikes: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const toInsert: ReturnType<typeof buildPayload>[] = [];
  const toUpdate: (ReturnType<typeof buildPayload> & { id: string })[] = [];
  let skipped = 0;
  let duplicates = 0;

  for (const { row, onDuplicate } of rows) {
    const insurerId = row.insurance_company
      ? (insurerIdByName.get(row.insurance_company.toLowerCase()) ?? null)
      : null;
    const payload = buildPayload(row, insurerId, batchId);
    const existingId = existingByStock.get(row.stock_number.toLowerCase());

    if (existingId) {
      duplicates++;
      if (onDuplicate === "skip") {
        skipped++;
        continue;
      }
      toUpdate.push({ ...payload, id: existingId });
    } else {
      toInsert.push(payload);
    }
  }

  const failures: string[] = [];
  let imported = 0;
  let updated = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_DB_PAGE) {
    const page = toInsert.slice(i, i + CHUNK_DB_PAGE);
    const { error } = await supabase.from("salvage_bikes").insert(page);
    if (error) {
      // One bad row fails the whole page, so retry the page individually to
      // save the good rows and name the row that actually broke.
      for (const one of page) {
        const { error: rowError } = await supabase.from("salvage_bikes").insert(one);
        if (rowError) {
          skipped++;
          failures.push(`${one.stock_number}: ${rowError.message}`);
        } else imported++;
      }
    } else {
      imported += page.length;
    }
  }

  for (let i = 0; i < toUpdate.length; i += CHUNK_DB_PAGE) {
    const page = toUpdate.slice(i, i + CHUNK_DB_PAGE);
    const { error } = await supabase.from("salvage_bikes").upsert(page);
    if (error) {
      for (const one of page) {
        const { error: rowError } = await supabase.from("salvage_bikes").upsert(one);
        if (rowError) {
          skipped++;
          failures.push(`${one.stock_number}: ${rowError.message}`);
        } else updated++;
      }
    } else {
      updated += page.length;
    }
  }

  return { imported, updated, skipped, duplicates, failures: failures.slice(0, 25) };
}

export type ImportResult = {
  error?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  invalid?: number;
  duplicates?: number;
};

/** Writes the final tallies onto the batch and refreshes affected pages. */
export async function finalizeImport(
  batchId: string,
  totals: {
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
    invalid: number;
    duplicates: number;
  }
): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "You do not have permission to import data." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("import_batches")
    .update({
      total_rows: totals.totalRows,
      imported_count: totals.imported,
      updated_count: totals.updated,
      skipped_count: totals.skipped,
      invalid_count: totals.invalid,
      duplicate_count: totals.duplicates,
    })
    .eq("id", batchId);

  if (error) {
    console.error("[imports] could not finalize batch:", error.message);
  }

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  revalidatePath("/imports");
  return {};
}
