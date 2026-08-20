import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ImportBatchRow } from "@/types/database";

export async function getRecentImportBatches(
  limit = 10
): Promise<ImportBatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load import history: ${error.message}`);
  return data ?? [];
}
