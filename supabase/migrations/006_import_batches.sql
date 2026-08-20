-- ============================================================================
-- 006_import_batches.sql
-- History of Excel import runs (PROJECT_SCOPE §19). Data Import is an Admin-
-- only feature, so this table follows the reference-table access pattern:
-- admin can read and write, nobody else can see it.
-- ============================================================================

create table public.import_batches (
  id               uuid primary key default gen_random_uuid(),
  file_name        text not null,
  sheet_name       text not null,
  total_rows       integer not null default 0,
  imported_count   integer not null default 0,
  updated_count    integer not null default 0,
  skipped_count    integer not null default 0,
  invalid_count    integer not null default 0,
  duplicate_count  integer not null default 0,
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null
);

comment on table public.import_batches is
  'One row per completed Excel import run (PROJECT_SCOPE §19). Rows are '
  'written once the import finishes — there is no in-progress state to model.';

alter table public.import_batches enable row level security;

create policy "import_batches_admin_all"
  on public.import_batches for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete
  on public.import_batches to authenticated;
