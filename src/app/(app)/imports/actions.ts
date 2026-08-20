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
  // stock_number casing in a historical workbook is never reliable, so this
  // compares case-insensitively client-side rather than trusting .in()'s
  // exact match.
  const { data, error } = await supabase.from("salvage_bikes").select("stock_number");
  if (error) return { error: `Could not check for duplicates: ${error.message}` };

  const existingLower = new Set((data ?? []).map((r) => r.stock_number.toLowerCase()));
  const duplicates = unique.filter((s) => existingLower.has(s.toLowerCase()));
  return { duplicates };
}

export type ImportRowInput = {
  row: NormalizedRow;
  /** How to handle this row if its stock number already exists. */
  onDuplicate: "skip" | "overwrite";
};

export type RunImportInput = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  invalidCount: number;
  rows: ImportRowInput[];
};

export type ImportResult = {
  error?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  invalid?: number;
  duplicates?: number;
};

/**
 * Final "Confirm -> Import" step. Never silently overwrites: a row only
 * updates an existing bike when the caller explicitly marked it "overwrite"
 * during the duplicate-review step.
 */
export async function runImport(input: RunImportInput): Promise<ImportResult> {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return { error: "You do not have permission to import data." };
  }

  if (input.rows.length === 0) {
    return { error: "There is nothing to import." };
  }

  const supabase = await createClient();

  // Resolve insurance company names to ids, creating any that don't exist —
  // historical spreadsheets name insurers freely, and refusing the whole row
  // over an unrecognized insurer name would defeat the point of a migration
  // tool.
  const insurerNames = [
    ...new Set(
      input.rows
        .map((r) => r.row.insurance_company)
        .filter((n): n is string => !!n)
    ),
  ];
  const insurerIdByName = new Map<string, string>();
  if (insurerNames.length > 0) {
    const { data: existing, error: existingErr } = await supabase
      .from("insurance_companies")
      .select("id, name");
    if (existingErr) {
      return { error: `Could not load insurance companies: ${existingErr.message}` };
    }
    for (const row of existing ?? []) {
      insurerIdByName.set(row.name.toLowerCase(), row.id);
    }
    const missing = insurerNames.filter(
      (n) => !insurerIdByName.has(n.toLowerCase())
    );
    if (missing.length > 0) {
      const { data: created, error: createErr } = await supabase
        .from("insurance_companies")
        .insert(missing.map((name) => ({ name })))
        .select("id, name");
      if (createErr) {
        return { error: `Could not create insurance companies: ${createErr.message}` };
      }
      for (const row of created ?? []) {
        insurerIdByName.set(row.name.toLowerCase(), row.id);
      }
    }
  }

  // Resolve which stock numbers already exist, to tell inserts from updates.
  const { data: existingBikes, error: existingBikesErr } = await supabase
    .from("salvage_bikes")
    .select("id, stock_number");
  if (existingBikesErr) {
    return { error: `Could not check existing bikes: ${existingBikesErr.message}` };
  }
  const existingByStockLower = new Map(
    (existingBikes ?? []).map((b) => [b.stock_number.toLowerCase(), b.id])
  );

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const { row, onDuplicate } of input.rows) {
    const existingId = existingByStockLower.get(row.stock_number.toLowerCase());

    const payload = {
      stock_number: row.stock_number,
      file_number: row.file_number,
      claim_number: row.claim_number,
      insurance_company_id: row.insurance_company
        ? (insurerIdByName.get(row.insurance_company.toLowerCase()) ?? null)
        : null,
      broker: row.broker,
      assessor: row.assessor,
      insured_name: row.insured_name,
      insured_phone: row.insured_phone,
      insured_email: row.insured_email,
      make: row.make,
      model: row.model,
      year: row.year,
      registration_number: row.registration_number,
      vin_number: row.vin_number,
      odometer: row.odometer,
      colour: row.colour,
      engine_number: row.engine_number,
      write_off_code: row.write_off_code,
      loss_date: row.loss_date,
      retail_value: row.retail_value,
      salvage_value: row.salvage_value,
      collection_location: row.collection_location,
      current_location: row.current_location,
      date_received: row.date_received,
      notes: row.notes,
    };

    if (existingId) {
      duplicates++;
      if (onDuplicate === "skip") {
        skipped++;
        continue;
      }
      const { error } = await supabase
        .from("salvage_bikes")
        .update(payload)
        .eq("id", existingId);
      if (error) {
        skipped++;
        continue;
      }
      updated++;
    } else {
      const { error } = await supabase.from("salvage_bikes").insert(payload);
      if (error) {
        skipped++;
        continue;
      }
      imported++;
      existingByStockLower.set(row.stock_number.toLowerCase(), "pending");
    }
  }

  const { error: batchError } = await supabase.from("import_batches").insert({
    file_name: input.fileName,
    sheet_name: input.sheetName,
    total_rows: input.totalRows,
    imported_count: imported,
    updated_count: updated,
    skipped_count: skipped,
    invalid_count: input.invalidCount,
    duplicate_count: duplicates,
  });
  if (batchError) {
    console.error("[imports] could not record import batch:", batchError.message);
  }

  revalidatePath("/bikes");
  revalidatePath("/dashboard");
  revalidatePath("/imports");

  return {
    imported,
    updated,
    skipped,
    invalid: input.invalidCount,
    duplicates,
  };
}
