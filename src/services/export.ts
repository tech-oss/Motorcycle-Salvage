import "server-only";
import { createClient } from "@/lib/supabase/server";
import { statusMeta } from "@/lib/status";
import {
  sheetForInsurer,
  toExportRow,
  type ExportBike,
  type ExportSourceRow,
} from "@/lib/export-columns";

/**
 * Data for the Excel master export (client requirement: "The program needs to
 * export to an Excel anyway... We must keep a master").
 *
 * The export mirrors the client's own workbook shape: one worksheet per
 * insurance grouping, with their column names, so the file they get back is
 * the file they recognise. Column definitions live in lib/export-columns.ts
 * so they can be verified against the importer.
 */

type Row = Omit<ExportSourceRow, "insurance_company_name"> & {
  insurance_companies: { name: string } | null;
};

const SELECT_COLUMNS =
  "stock_number, file_number, claim_number, broker, loss_date, claims_handler, " +
  "salvage_clerk, make, model, engine_capacity_cc, year, keys_status, vin_number, " +
  "engine_number, registration_number, write_off_code, retail_value, salvage_value, " +
  "salvage_percentage, mssa_commission, release_fee, estimator_cost, " +
  "insurance_invoice_no, insurance_amount, status, current_location, arrival_date, " +
  "date_received, sold_to, selling_amount, notes, insurance_companies(name)";

/** PostgREST caps a single response, so the export pages through everything. */
const PAGE_SIZE = 1000;

export type MasterExport = {
  /** Worksheet name -> rows, matching the client's tab structure. */
  sheets: Record<string, ExportBike[]>;
  total: number;
};

export async function getMasterExport({
  includeArchived = true,
}: { includeArchived?: boolean } = {}): Promise<MasterExport> {
  const supabase = await createClient();
  const sheets: Record<string, ExportBike[]> = {};
  const statusLabel = (code: string) => statusMeta(code).label;
  let total = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("salvage_bikes")
      .select(SELECT_COLUMNS)
      .order("stock_number")
      .range(from, from + PAGE_SIZE - 1);

    if (!includeArchived) query = query.eq("archived", false);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to build export: ${error.message}`);

    const page = (data ?? []) as unknown as Row[];
    for (const row of page) {
      const name = row.insurance_companies?.name ?? null;
      const sheet = sheetForInsurer(name);
      (sheets[sheet] ??= []).push(
        toExportRow({ ...row, insurance_company_name: name }, statusLabel)
      );
      total++;
    }

    if (page.length < PAGE_SIZE) break;
  }

  return { sheets, total };
}
