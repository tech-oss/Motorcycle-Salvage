/**
 * Concatenates the migrations into one file for pasting into the Supabase SQL
 * editor in a single go. The files under supabase/migrations/ remain the
 * source of truth — this is only a convenience for first-time setup.
 *
 * Run: node scripts/bundle-migrations.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const outFile = join(root, "supabase", "ALL_MIGRATIONS.sql");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const banner = `-- =============================================================
-- Motorcycle Salvage Management Platform
-- All migrations combined, in order, for the Supabase SQL editor.
--
-- GENERATED FILE — do not edit. Edit supabase/migrations/*.sql and
-- re-run: node scripts/bundle-migrations.mjs
--
-- Included: ${files.join(", ")}
-- =============================================================

`;

const body = files
  .map(
    (f) =>
      `-- >>>>>>>>>>>>>>>>>>>> ${f} >>>>>>>>>>>>>>>>>>>>\n\n` +
      readFileSync(join(migrationsDir, f), "utf8").trimEnd() +
      "\n"
  )
  .join("\n\n");

writeFileSync(outFile, banner + body);
console.log(`Wrote ${outFile} (${files.length} migrations)`);
