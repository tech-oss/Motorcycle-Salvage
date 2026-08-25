/**
 * Validates the SQL migrations against a real PostgreSQL engine (PGlite, the
 * Postgres WASM build) without needing Docker or a live Supabase project.
 *
 * Supabase manages the `auth` and `storage` schemas for us, so this script
 * stands up a minimal shim of the objects our migrations actually reference
 * (auth.users, auth.uid(), storage.buckets, storage.objects, the standard
 * roles) and then applies 001 → 002 → 003 in order.
 *
 * What this proves: the DDL parses and executes, FKs/checks/triggers/policies
 * and indexes are all valid, and the RLS helper functions behave. It is not a
 * substitute for applying the migrations to the real project — see README.
 *
 * Run: node scripts/validate-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const SUPABASE_SHIM = `
  create schema if not exists auth;
  create schema if not exists storage;

  -- Supabase's standard roles.
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls;
    end if;
  end $$;

  -- Supabase ships these default privileges, which hand anon full access to
  -- tables as they are created. Modelling them here is essential: without it
  -- the "anon has no privileges" assertion below passes trivially and hides a
  -- real misconfiguration on the actual project.
  alter default privileges in schema public
    grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public
    grant all on sequences to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;

  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
  );

  -- Test harness stand-in for Supabase's JWT-backed auth.uid().
  create table if not exists auth._session (
    only_row boolean primary key default true check (only_row),
    user_id uuid
  );
  insert into auth._session (only_row, user_id)
    values (true, null) on conflict do nothing;

  create or replace function auth.uid() returns uuid
  language sql stable as $$ select user_id from auth._session where only_row $$;

  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    -- Supabase's real bucket table carries these; 005 sets them, so the shim
    -- must have them or the migration passes here and fails in production.
    file_size_limit bigint,
    allowed_mime_types text[],
    created_at timestamptz not null default now()
  );

  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz not null default now()
  );
  alter table storage.objects enable row level security;
`;

function log(status, message) {
  const mark = status === "ok" ? "[32m✓[0m" : "[31m✗[0m";
  console.log(`${mark} ${message}`);
}

async function main() {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  log("ok", "Supabase auth/storage shim created");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) throw new Error("No migration files found");

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    try {
      await db.exec(sql);
      log("ok", `applied ${file}`);
    } catch (err) {
      log("fail", `${file}: ${err.message}`);
      process.exitCode = 1;
      await db.close();
      return;
    }
  }

  await runChecks(db);
  await db.close();
}

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

/** Runs a statement as the admin user, then restores no session. */
async function asAdmin(db, sql) {
  await db.exec(`update auth._session set user_id = '${ADMIN_ID}'`);
  await db.exec(sql);
}

async function expect(db, label, sql, predicate) {
  const res = await db.query(sql);
  const ok = predicate(res.rows);
  log(ok ? "ok" : "fail", label);
  if (!ok) {
    console.log("   got:", JSON.stringify(res.rows));
    process.exitCode = 1;
  }
}

async function runChecks(db) {
  console.log("\n--- schema checks ---");

  const expectedTables = [
    "audit_logs", "bike_photos", "bike_statuses", "communications",
    "documents", "import_batches", "insurance_companies", "locations",
    "profiles", "salvage_bikes", "transporters", "upliftments",
  ];
  await expect(
    db,
    `all ${expectedTables.length} tables exist`,
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
    (rows) => {
      const names = rows.map((r) => r.table_name);
      return expectedTables.every((t) => names.includes(t));
    }
  );

  // Every field the brief listed for salvage_bikes must be present.
  const requiredBikeColumns = [
    "id", "stock_number", "file_number", "claim_number", "status",
    "insurance_company_id", "broker", "assessor", "assessor_contact",
    "insured_name", "insured_address", "insured_phone", "insured_email",
    "make", "model", "year", "registration_number", "vin_number", "odometer",
    "colour", "engine_number", "keys_status", "write_off_code", "loss_date",
    "pre_accident_condition", "severity_of_impact", "pre_accident_damage",
    "tyre_condition", "tyre_depth_left_front", "tyre_depth_right_front",
    "tyre_depth_left_rear", "tyre_depth_right_rear",
    "collection_location", "collection_contact", "collection_phone",
    "delivery_location", "current_location", "storage_location",
    "retail_value", "salvage_value", "salvage_percentage", "mssa_commission",
    "release_fee", "release_payment_date", "total_loss", "estimator_cost",
    "transporter_id", "transport_contact_person", "transport_contact_number",
    "upliftment_date", "upliftment_time", "upliftment_sent_date",
    "upliftment_received_date", "pickup_address", "delivery_address",
    "upliftment_notes",
    "date_received", "assigned_to", "notes", "created_at", "updated_at",
    "created_by", "updated_by", "archived",
  ];
  await expect(
    db,
    `salvage_bikes has all ${requiredBikeColumns.length} specified columns`,
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'salvage_bikes'`,
    (rows) => {
      const names = rows.map((r) => r.column_name);
      const missing = requiredBikeColumns.filter((c) => !names.includes(c));
      if (missing.length) console.log("   missing:", missing.join(", "));
      return missing.length === 0;
    }
  );

  await expect(
    db,
    "RLS enabled on every public table",
    `select c.relname, c.relrowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`,
    (rows) => rows.every((r) => r.relrowsecurity === true)
  );

  await expect(
    db,
    "audit_logs is append-only (no update/delete policy)",
    `select cmd from pg_policies
      where schemaname = 'public' and tablename = 'audit_logs'`,
    (rows) => {
      const cmds = rows.map((r) => r.cmd);
      return !cmds.includes("UPDATE") && !cmds.includes("DELETE");
    }
  );

  await expect(
    db,
    "user_role enum is admin/staff/viewer",
    `select e.enumlabel from pg_enum e
       join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_role' order by e.enumsortorder`,
    (rows) =>
      JSON.stringify(rows.map((r) => r.enumlabel)) ===
      JSON.stringify(["admin", "staff", "viewer"]),
  );

  await expect(
    db,
    "workflow statuses seeded (7 from 001 + 3 from the client's master)",
    `select count(*)::int as n from public.bike_statuses`,
    (rows) => rows[0].n === 10
  );

  // The import maps the master's own status words onto these codes; a missing
  // one would make imported bikes fail their FK to bike_statuses.
  await expect(
    db,
    "master workflow statuses present (sold / not_sold / no_salvage)",
    `select code from public.bike_statuses
      where code in ('sold', 'not_sold', 'no_salvage')`,
    (rows) => rows.length === 3
  );

  // Every column the client's master workbook needs a home for.
  const masterColumns = [
    "engine_capacity_cc", "claims_handler", "salvage_clerk", "arrival_date",
    "sold_to", "selling_amount", "insurance_invoice_no", "insurance_amount",
    "source_row", "import_batch_id",
  ];
  await expect(
    db,
    "salvage_bikes carries the master-import columns",
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'salvage_bikes'`,
    (rows) => {
      const names = rows.map((r) => r.column_name);
      const missing = masterColumns.filter((c) => !names.includes(c));
      if (missing.length) console.log("   missing:", missing.join(", "));
      return missing.length === 0;
    }
  );

  // source_row is what makes the historical import lossless — if it is not
  // jsonb, the unmapped ~90 ledger columns have nowhere to go.
  await expect(
    db,
    "source_row is jsonb (lossless historical import)",
    `select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'salvage_bikes'
        and column_name = 'source_row'`,
    (rows) => rows[0]?.data_type === "jsonb"
  );

  // The commission chain (client feedback, 2026-08-25) — rate is always
  // typed, everything else is derived from it server-side.
  const commissionColumns = [
    "commission_rate_percent", "total_comms_incl_vat", "insurance_inv_to_mssa",
  ];
  await expect(
    db,
    "salvage_bikes carries the commission-chain columns",
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'salvage_bikes'`,
    (rows) => {
      const names = rows.map((r) => r.column_name);
      const missing = commissionColumns.filter((c) => !names.includes(c));
      if (missing.length) console.log("   missing:", missing.join(", "));
      return missing.length === 0;
    }
  );

  await expect(
    db,
    "both storage buckets created and private",
    `select id, public from storage.buckets order by id`,
    (rows) =>
      rows.length === 2 &&
      rows.every((r) => r.public === false) &&
      rows.map((r) => r.id).join(",") === "documents,photos"
  );

  await expect(
    db,
    "buckets carry size and MIME limits (uploads bypass the server)",
    `select id, file_size_limit, array_length(allowed_mime_types, 1) as mime_count
       from storage.buckets order by id`,
    (rows) =>
      rows.length === 2 &&
      rows.every((r) => r.file_size_limit > 0 && r.mime_count > 0)
  );

  const policyCount = await db.query(
    `select count(*)::int as n from pg_policies where schemaname = 'public'`
  );
  log("ok", `${policyCount.rows[0].n} RLS policies on public schema`);

  const indexCount = await db.query(
    `select count(*)::int as n from pg_indexes
      where schemaname = 'public' and indexname like 'idx_%'`
  );
  log("ok", `${indexCount.rows[0].n} explicit indexes created`);

  console.log("\n--- behavioural checks ---");

  // Signup trigger should materialize a profile with the least-privilege role.
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data)
    values ('11111111-1111-1111-1111-111111111111', 'admin@example.com',
            '{"full_name":"Ada Admin"}'::jsonb);
    insert into auth.users (id, email)
    values ('22222222-2222-2222-2222-222222222222', 'staff@example.com');
  `);

  await expect(
    db,
    "handle_new_user() creates a profile on signup",
    `select id, email, full_name, role from public.profiles order by email`,
    (rows) =>
      rows.length === 2 &&
      rows[0].email === "admin@example.com" &&
      rows[0].full_name === "Ada Admin" &&
      rows.every((r) => r.role === "viewer")
  );

  // Bootstrap: with no JWT (service role / SQL editor) the guard stands aside,
  // which is the only way the first admin can ever come into existence.
  await db.exec(`
    update public.profiles set role = 'admin'
      where email = 'admin@example.com';
    update public.profiles set role = 'staff'
      where email = 'staff@example.com';
  `);
  log("ok", "first admin can be bootstrapped without a JWT (service role)");

  // Role helpers must reflect the acting user.
  await db.exec(
    `update auth._session set user_id = '11111111-1111-1111-1111-111111111111'`
  );
  await expect(
    db,
    "is_admin()/can_write()/can_read() true for admin",
    `select public.is_admin() a, public.can_write() w, public.can_read() r`,
    (rows) => rows[0].a === true && rows[0].w === true && rows[0].r === true
  );

  await db.exec(
    `update auth._session set user_id = '22222222-2222-2222-2222-222222222222'`
  );
  await expect(
    db,
    "staff: can_write() true, is_admin() false",
    `select public.is_admin() a, public.can_write() w, public.can_read() r`,
    (rows) => rows[0].a === false && rows[0].w === true && rows[0].r === true
  );

  // Role changes must be made by an admin — demote as admin, then act as the
  // demoted user to observe the effect.
  await asAdmin(db, `update public.profiles set role = 'viewer'
                       where id = '22222222-2222-2222-2222-222222222222'`);
  await db.exec(
    `update auth._session set user_id = '22222222-2222-2222-2222-222222222222'`
  );
  await expect(
    db,
    "viewer: read-only (can_read true, can_write false)",
    `select public.is_admin() a, public.can_write() w, public.can_read() r`,
    (rows) => rows[0].a === false && rows[0].w === false && rows[0].r === true
  );

  // A deactivated account must lose every capability.
  await asAdmin(db, `update public.profiles set is_active = false
                       where id = '22222222-2222-2222-2222-222222222222'`);
  await db.exec(
    `update auth._session set user_id = '22222222-2222-2222-2222-222222222222'`
  );
  await expect(
    db,
    "deactivated user loses read access",
    `select public.can_read() r`,
    (rows) => rows[0].r === false
  );
  await asAdmin(db, `update public.profiles set is_active = true, role = 'staff'
                       where id = '22222222-2222-2222-2222-222222222222'`);

  // Bike insert should fire both the actor stamp and the audit trigger.
  await db.exec(
    `update auth._session set user_id = '11111111-1111-1111-1111-111111111111'`
  );
  await db.exec(`
    insert into public.salvage_bikes (stock_number, make, model, year)
    values ('M01187', 'Triumph', '800 XC', 2012);
  `);

  await expect(
    db,
    "created_by/updated_by stamped from auth.uid()",
    `select created_by, updated_by, status, archived
       from public.salvage_bikes where stock_number = 'M01187'`,
    (rows) =>
      rows[0].created_by === "11111111-1111-1111-1111-111111111111" &&
      rows[0].updated_by === "11111111-1111-1111-1111-111111111111" &&
      rows[0].status === "new_instruction" &&
      rows[0].archived === false
  );

  await expect(
    db,
    "audit log records bike creation",
    `select action from public.audit_logs where table_name = 'salvage_bikes'`,
    (rows) => rows.length === 1 && rows[0].action === "created"
  );

  await db.exec(
    `update public.salvage_bikes set status = 'in_transit'
       where stock_number = 'M01187'`
  );
  await expect(
    db,
    "status change is audited with old and new value",
    `select action, old_value, new_value from public.audit_logs
      where action = 'status_changed'`,
    (rows) =>
      rows.length === 1 &&
      rows[0].old_value === "new_instruction" &&
      rows[0].new_value === "in_transit"
  );

  await db.exec(
    `update public.salvage_bikes set archived = true
       where stock_number = 'M01187'`
  );
  await expect(
    db,
    "archiving is audited",
    `select action from public.audit_logs where action = 'archived'`,
    (rows) => rows.length === 1
  );

  await expect(
    db,
    "updated_at advances on update",
    `select (updated_at > created_at) as advanced
       from public.salvage_bikes where stock_number = 'M01187'`,
    (rows) => rows[0].advanced === true
  );

  // Constraint checks.
  const mustFail = async (label, sql) => {
    try {
      await db.exec(sql);
      log("fail", `${label} (expected rejection, statement succeeded)`);
      process.exitCode = 1;
    } catch {
      log("ok", label);
    }
  };

  await mustFail(
    "duplicate stock_number rejected",
    `insert into public.salvage_bikes (stock_number) values ('M01187')`
  );
  await mustFail(
    "unknown status rejected by FK to bike_statuses",
    `insert into public.salvage_bikes (stock_number, status)
       values ('M99999', 'not_a_real_status')`
  );
  await mustFail(
    "out-of-range year rejected",
    `insert into public.salvage_bikes (stock_number, year)
       values ('M99998', 1700)`
  );
  await mustFail(
    "negative odometer rejected",
    `insert into public.salvage_bikes (stock_number, odometer)
       values ('M99997', -5)`
  );
  await mustFail(
    "salvage_percentage over 100 rejected",
    `insert into public.salvage_bikes (stock_number, salvage_percentage)
       values ('M99996', 101)`
  );
  await mustFail(
    "commission_rate_percent over 100 rejected",
    `insert into public.salvage_bikes (stock_number, commission_rate_percent)
       values ('M99995', 150)`
  );

  // Privilege-escalation guard: a staff user editing their own profile.
  await db.exec(
    `update auth._session set user_id = '22222222-2222-2222-2222-222222222222'`
  );
  await mustFail(
    "staff cannot self-promote to admin",
    `update public.profiles set role = 'admin'
       where id = '22222222-2222-2222-2222-222222222222'`
  );
  await mustFail(
    "staff cannot reactivate/deactivate accounts",
    `update public.profiles set is_active = false
       where id = '22222222-2222-2222-2222-222222222222'`
  );

  // Same statement must succeed for an admin.
  await db.exec(
    `update auth._session set user_id = '11111111-1111-1111-1111-111111111111'`
  );
  await db.exec(
    `update public.profiles set role = 'staff'
       where id = '22222222-2222-2222-2222-222222222222'`
  );
  log("ok", "admin can change roles");

  // Cascade behaviour: child rows follow the bike.
  await db.exec(`
    insert into public.documents (bike_id, name, storage_path)
    select id, 'Report.pdf', 'documents/' || id || '/report.pdf'
      from public.salvage_bikes where stock_number = 'M01187';
    insert into public.bike_photos (bike_id, storage_path)
    select id, 'photos/' || id || '/front.jpg'
      from public.salvage_bikes where stock_number = 'M01187';
    insert into public.communications (bike_id, note)
    select id, 'Called the tow yard.'
      from public.salvage_bikes where stock_number = 'M01187';
  `);
  await db.exec(`delete from public.salvage_bikes where stock_number = 'M01187'`);
  await expect(
    db,
    "deleting a bike cascades to documents/photos/communications",
    `select
       (select count(*)::int from public.documents) d,
       (select count(*)::int from public.bike_photos) p,
       (select count(*)::int from public.communications) c`,
    (rows) => rows[0].d === 0 && rows[0].p === 0 && rows[0].c === 0
  );

  console.log("\n--- grant checks ---");

  // anon must be shut out at the grant level, before RLS is even consulted.
  await expect(
    db,
    "anon has no table privileges in public schema",
    `select count(*)::int as n
       from information_schema.role_table_grants
      where grantee = 'anon' and table_schema = 'public'`,
    (rows) => rows[0].n === 0
  );

  await expect(
    db,
    "authenticated has CRUD on salvage_bikes",
    `select privilege_type from information_schema.role_table_grants
      where grantee = 'authenticated' and table_schema = 'public'
        and table_name = 'salvage_bikes'`,
    (rows) => {
      const p = rows.map((r) => r.privilege_type);
      return ["SELECT", "INSERT", "UPDATE", "DELETE"].every((x) =>
        p.includes(x)
      );
    }
  );

  console.log(
    process.exitCode
      ? "\n[31mValidation FAILED[0m"
      : "\n[32mAll migration checks passed[0m"
  );
}

main().catch((err) => {
  console.error("[31m✗[0m", err);
  process.exit(1);
});
