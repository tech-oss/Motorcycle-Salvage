-- =============================================================
-- Motorcycle Salvage Management Platform
-- All migrations combined, in order, for the Supabase SQL editor.
--
-- GENERATED FILE — do not edit. Edit supabase/migrations/*.sql and
-- re-run: node scripts/bundle-migrations.mjs
--
-- Included: 001_initial_schema.sql, 002_rls_policies.sql, 003_indexes.sql, 004_revoke_anon_privileges.sql, 005_storage_constraints.sql, 006_import_batches.sql, 007_master_import_fields.sql, 008_commission_calculation.sql
-- =============================================================

-- >>>>>>>>>>>>>>>>>>>> 001_initial_schema.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 001_initial_schema.sql
-- Motorcycle Salvage Management Platform — core schema.
--
-- Design notes:
--   * Insurance companies, transporters and locations are lookup tables, not
--     free text on the bike, so the dashboard's "by insurer" / "by location"
--     aggregations and the admin-managed sections work off real relations.
--   * Bike status is a lookup TABLE (not an enum) because PROJECT_SCOPE §18
--     says the workflow must be expandable without touching application code.
--     The column stays literally named `status` and holds a readable code.
--   * Small, genuinely stable value sets (document type, photo category,
--     communication type, keys status) are enums — cheaper than a table and
--     still extendable via ALTER TYPE ... ADD VALUE.
-- ============================================================================

-- gen_random_uuid() is core Postgres since v13, so no pgcrypto extension is
-- needed on Supabase (PG15+).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'staff', 'viewer');

create type public.keys_status as enum ('yes', 'no', 'tbc');

create type public.document_type as enum (
  'insurance_report',
  'release_invoice',
  'transport_invoice',
  'pop',
  'purchase_agreement',
  'upliftment_instruction',
  'other'
);

create type public.photo_category as enum (
  'front', 'rear', 'left', 'right',
  'odometer', 'vin', 'engine', 'damage', 'other'
);

create type public.communication_type as enum (
  'email', 'phone', 'whatsapp', 'internal_note', 'other'
);

create type public.upliftment_status as enum (
  'pending', 'scheduled', 'in_transit', 'collected', 'cancelled'
);

create type public.audit_action as enum (
  'created', 'updated', 'status_changed', 'document_uploaded',
  'photo_uploaded', 'archived', 'restored', 'deleted'
);

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at honest regardless of what the client sends.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Stamps created_by/updated_by from the JWT so the client cannot spoof them.
create or replace function public.set_actor_columns()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  elsif (tg_op = 'UPDATE') then
    new.created_by = old.created_by;
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — extends auth.users with role and display info
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile per auth user. Role drives every RLS policy.';
comment on column public.profiles.role is
  'New signups default to viewer (least privilege); an admin promotes them.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Creates the profile row on signup. SECURITY DEFINER because the signing-up
-- user has no rights on public.profiles at the moment the trigger fires.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helper functions
--
-- SECURITY DEFINER is essential: policies ON public.profiles call these, and a
-- non-definer function would re-enter those same policies and recurse forever.
-- ---------------------------------------------------------------------------

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

-- Staff and admins both perform operational writes.
create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'staff'), false)
$$;

-- Any active profile may read. Viewer is read-only, not read-nothing.
create or replace function public.can_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('admin', 'staff', 'viewer'),
    false
  )
$$;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.bike_statuses (
  code        text primary key,
  label       text not null,
  sort_order  integer not null default 0,
  is_archived_state boolean not null default false
);

comment on table public.bike_statuses is
  'Workflow states. Add rows to extend the workflow — no code change needed.';

insert into public.bike_statuses (code, label, sort_order, is_archived_state) values
  ('new_instruction',    'New Instruction',    10, false),
  ('upliftment_pending', 'Upliftment Pending', 20, false),
  ('scheduled',          'Scheduled',          30, false),
  ('in_transit',         'In Transit',         40, false),
  ('received',           'Received',           50, false),
  ('ready_for_sale',     'Ready for Sale',     60, false),
  ('archived',           'Archived',           70, true);

create table public.insurance_companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  notes          text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null
);

create table public.transporters (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  notes          text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null
);

create table public.locations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  address        text,
  city           text,
  province       text,
  contact_person text,
  phone          text,
  notes          text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null
);

create trigger insurance_companies_set_updated_at
  before update on public.insurance_companies
  for each row execute function public.set_updated_at();
create trigger insurance_companies_set_actor
  before insert or update on public.insurance_companies
  for each row execute function public.set_actor_columns();

create trigger transporters_set_updated_at
  before update on public.transporters
  for each row execute function public.set_updated_at();
create trigger transporters_set_actor
  before insert or update on public.transporters
  for each row execute function public.set_actor_columns();

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();
create trigger locations_set_actor
  before insert or update on public.locations
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- salvage_bikes — the one central record per bike
-- ---------------------------------------------------------------------------

create table public.salvage_bikes (
  id                       uuid primary key default gen_random_uuid(),

  -- Identification
  stock_number             text not null unique,
  file_number              text,
  claim_number             text,
  status                   text not null default 'new_instruction'
                             references public.bike_statuses (code)
                             on update cascade,

  -- Insurance
  insurance_company_id     uuid references public.insurance_companies (id)
                             on delete set null,
  broker                   text,
  assessor                 text,
  assessor_contact         text,
  insured_name             text,
  insured_address          text,
  insured_phone            text,
  insured_email            text,

  -- Motorcycle
  make                     text,
  model                    text,
  year                     integer,
  registration_number      text,
  vin_number               text,
  odometer                 integer,
  colour                   text,
  engine_number            text,
  keys_status              public.keys_status,
  write_off_code           text,
  loss_date                date,

  -- Condition
  pre_accident_condition   text,
  severity_of_impact       text,
  pre_accident_damage      text,
  tyre_condition           text,
  tyre_depth_left_front    numeric(4, 1),
  tyre_depth_right_front   numeric(4, 1),
  tyre_depth_left_rear     numeric(4, 1),
  tyre_depth_right_rear    numeric(4, 1),

  -- Location
  collection_location      text,
  collection_location_id   uuid references public.locations (id) on delete set null,
  collection_contact       text,
  collection_phone         text,
  delivery_location        text,
  delivery_location_id     uuid references public.locations (id) on delete set null,
  current_location         text,
  current_location_id      uuid references public.locations (id) on delete set null,
  storage_location         text,
  storage_location_id      uuid references public.locations (id) on delete set null,

  -- Financial (numeric, never float — these are money)
  retail_value             numeric(12, 2),
  salvage_value            numeric(12, 2),
  salvage_percentage       numeric(5, 2),
  mssa_commission          numeric(12, 2),
  release_fee              numeric(12, 2),
  release_payment_date     date,
  total_loss               boolean not null default false,
  estimator_cost           numeric(12, 2),

  -- Upliftment (current/primary; full history lives in public.upliftments)
  transporter_id           uuid references public.transporters (id) on delete set null,
  transport_contact_person text,
  transport_contact_number text,
  upliftment_date          date,
  upliftment_time          time,
  upliftment_sent_date     date,
  upliftment_received_date date,
  pickup_address           text,
  delivery_address         text,
  upliftment_notes         text,

  -- Administrative
  date_received            date,
  assigned_to              uuid references public.profiles (id) on delete set null,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references public.profiles (id) on delete set null,
  updated_by               uuid references public.profiles (id) on delete set null,
  archived                 boolean not null default false,

  constraint salvage_bikes_year_range
    check (year is null or (year between 1900 and 2100)),
  constraint salvage_bikes_odometer_positive
    check (odometer is null or odometer >= 0),
  constraint salvage_bikes_salvage_percentage_range
    check (salvage_percentage is null
           or (salvage_percentage >= 0 and salvage_percentage <= 100))
);

comment on table public.salvage_bikes is
  'ONE BIKE = ONE CENTRAL RECORD (PROJECT_SCOPE §1). stock_number is the '
  'business key used for Excel-import duplicate detection and QR targets.';
comment on column public.salvage_bikes.collection_location is
  'Free-text address as captured. *_location_id FKs are the normalized '
  'relation used for reporting; both are kept because historical Excel rows '
  'arrive as text that may not match a known location.';

create trigger salvage_bikes_set_updated_at
  before update on public.salvage_bikes
  for each row execute function public.set_updated_at();
create trigger salvage_bikes_set_actor
  before insert or update on public.salvage_bikes
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- upliftments — each generated upliftment instruction for a bike
-- ---------------------------------------------------------------------------

create table public.upliftments (
  id                    uuid primary key default gen_random_uuid(),
  bike_id               uuid not null references public.salvage_bikes (id)
                          on delete cascade,
  transporter_id        uuid references public.transporters (id) on delete set null,
  status                public.upliftment_status not null default 'pending',
  reference             text,
  contact_person        text,
  contact_number        text,
  upliftment_date       date,
  upliftment_time       time,
  sent_date             date,
  received_date         date,
  pickup_address        text,
  delivery_address      text,
  notes                 text,
  -- Storage path of the generated PDF, if one has been produced.
  document_path         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null
);

comment on table public.upliftments is
  'History of upliftment instructions per bike. salvage_bikes carries the '
  'current values for quick access; this table is the audit-friendly record '
  'of each instruction actually issued.';

create trigger upliftments_set_updated_at
  before update on public.upliftments
  for each row execute function public.set_updated_at();
create trigger upliftments_set_actor
  before insert or update on public.upliftments
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  bike_id        uuid not null references public.salvage_bikes (id) on delete cascade,
  upliftment_id  uuid references public.upliftments (id) on delete set null,
  name           text not null,
  document_type  public.document_type not null default 'other',
  storage_path   text not null unique,
  mime_type      text,
  file_size      bigint,
  notes          text,
  -- Phase 2 seam: distinguishes manual uploads from future auto-ingestion
  -- without needing a schema change (ARCHITECTURE.md §14).
  source         text not null default 'manual_upload',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  constraint documents_file_size_positive
    check (file_size is null or file_size >= 0)
);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();
create trigger documents_set_actor
  before insert or update on public.documents
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- bike_photos
-- ---------------------------------------------------------------------------

create table public.bike_photos (
  id            uuid primary key default gen_random_uuid(),
  bike_id       uuid not null references public.salvage_bikes (id) on delete cascade,
  category      public.photo_category not null default 'other',
  caption       text,
  storage_path  text not null unique,
  mime_type     text,
  file_size     bigint,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles (id) on delete set null,
  updated_by    uuid references public.profiles (id) on delete set null,

  constraint bike_photos_file_size_positive
    check (file_size is null or file_size >= 0)
);

create trigger bike_photos_set_updated_at
  before update on public.bike_photos
  for each row execute function public.set_updated_at();
create trigger bike_photos_set_actor
  before insert or update on public.bike_photos
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- communications — manual communication timeline
-- ---------------------------------------------------------------------------

create table public.communications (
  id                 uuid primary key default gen_random_uuid(),
  bike_id            uuid not null references public.salvage_bikes (id) on delete cascade,
  communication_type public.communication_type not null default 'internal_note',
  occurred_at        timestamptz not null default now(),
  from_party         text,
  to_party           text,
  subject            text,
  note               text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null
);

comment on table public.communications is
  'Manually logged communication only. Phase 1 has no inbox integration.';

create trigger communications_set_updated_at
  before update on public.communications
  for each row execute function public.set_updated_at();
create trigger communications_set_actor
  before insert or update on public.communications
  for each row execute function public.set_actor_columns();

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  bike_id      uuid references public.salvage_bikes (id) on delete cascade,
  table_name   text not null,
  record_id    uuid,
  action       public.audit_action not null,
  field_name   text,
  old_value    text,
  new_value    text,
  changed_data jsonb,
  actor_id     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only history. No UPDATE/DELETE policy exists for any role, so rows '
  'cannot be rewritten through the API.';

-- Records bike creation, archive/restore and status changes automatically, so
-- the trail does not depend on the application remembering to write one.
create or replace function public.log_bike_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.audit_logs (bike_id, table_name, record_id, action, actor_id)
    values (new.id, 'salvage_bikes', new.id, 'created', auth.uid());

  elsif (tg_op = 'UPDATE') then
    if (new.status is distinct from old.status) then
      insert into public.audit_logs (
        bike_id, table_name, record_id, action, field_name,
        old_value, new_value, actor_id
      )
      values (
        new.id, 'salvage_bikes', new.id, 'status_changed', 'status',
        old.status, new.status, auth.uid()
      );
    end if;

    if (new.archived is distinct from old.archived) then
      insert into public.audit_logs (bike_id, table_name, record_id, action, actor_id)
      values (
        new.id, 'salvage_bikes', new.id,
        case when new.archived then 'archived'::public.audit_action
             else 'restored'::public.audit_action end,
        auth.uid()
      );
    end if;
  end if;

  return null;
end;
$$;

create trigger salvage_bikes_audit
  after insert or update on public.salvage_bikes
  for each row execute function public.log_bike_changes();

-- ---------------------------------------------------------------------------
-- Storage buckets — private; access is via signed URLs only.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('photos', 'photos', false)
on conflict (id) do nothing;


-- >>>>>>>>>>>>>>>>>>>> 002_rls_policies.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 002_rls_policies.sql
-- Row Level Security. This — not the UI — is the real authorization boundary.
--
-- Role model (PROJECT_SCOPE §7):
--   admin  — full access, including user management and hard deletes
--   staff  — create/edit operational data; no deletes, no role changes
--   viewer — read-only across the board
--
-- Every policy is written against the SECURITY DEFINER helpers from 001 so
-- that a policy on public.profiles never re-enters itself.
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.bike_statuses       enable row level security;
alter table public.insurance_companies enable row level security;
alter table public.transporters        enable row level security;
alter table public.locations           enable row level security;
alter table public.salvage_bikes       enable row level security;
alter table public.upliftments         enable row level security;
alter table public.documents           enable row level security;
alter table public.bike_photos         enable row level security;
alter table public.communications      enable row level security;
alter table public.audit_logs          enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- A user can always see their own profile, otherwise normal read rules apply.
-- Without the self-clause a brand-new user could not resolve their own role.
create policy "profiles_select"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.can_read());

-- Self-service edits only. Role and is_active are locked down below.
create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A non-admin editing their own row must not be able to grant themselves a
-- role or reactivate a disabled account. RLS WITH CHECK cannot compare against
-- the previous row, so this is enforced by trigger.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No JWT means this is not a PostgREST request from a signed-in user: it is
  -- the service role, a server-side job, or the SQL editor. Those are already
  -- trusted (they can bypass RLS entirely), and this escape is what makes
  -- bootstrapping the FIRST admin possible — otherwise no admin could ever
  -- exist to promote anyone. Anonymous API callers cannot reach this trigger
  -- because every profiles policy is granted `to authenticated` only.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if (new.role is distinct from old.role) then
    raise exception 'Only an administrator may change a user role';
  end if;

  if (new.is_active is distinct from old.is_active) then
    raise exception 'Only an administrator may activate or deactivate a user';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- bike_statuses — readable by all signed-in users, maintained by admins
-- ---------------------------------------------------------------------------

create policy "bike_statuses_select"
  on public.bike_statuses for select to authenticated
  using (public.can_read());

create policy "bike_statuses_admin_write"
  on public.bike_statuses for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Reference tables: insurance_companies, transporters, locations
--
-- PROJECT_SCOPE §7 assigns management of these specifically to Admin, so staff
-- get read access only.
-- ---------------------------------------------------------------------------

create policy "insurance_companies_select"
  on public.insurance_companies for select to authenticated
  using (public.can_read());

create policy "insurance_companies_admin_write"
  on public.insurance_companies for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "transporters_select"
  on public.transporters for select to authenticated
  using (public.can_read());

create policy "transporters_admin_write"
  on public.transporters for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "locations_select"
  on public.locations for select to authenticated
  using (public.can_read());

create policy "locations_admin_write"
  on public.locations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- salvage_bikes
-- ---------------------------------------------------------------------------

create policy "salvage_bikes_select"
  on public.salvage_bikes for select to authenticated
  using (public.can_read());

create policy "salvage_bikes_insert"
  on public.salvage_bikes for insert to authenticated
  with check (public.can_write());

create policy "salvage_bikes_update"
  on public.salvage_bikes for update to authenticated
  using (public.can_write())
  with check (public.can_write());

-- Deletion is destructive and irreversible; staff archive instead.
create policy "salvage_bikes_delete_admin"
  on public.salvage_bikes for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- upliftments
-- ---------------------------------------------------------------------------

create policy "upliftments_select"
  on public.upliftments for select to authenticated
  using (public.can_read());

create policy "upliftments_insert"
  on public.upliftments for insert to authenticated
  with check (public.can_write());

create policy "upliftments_update"
  on public.upliftments for update to authenticated
  using (public.can_write())
  with check (public.can_write());

create policy "upliftments_delete_admin"
  on public.upliftments for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create policy "documents_select"
  on public.documents for select to authenticated
  using (public.can_read());

create policy "documents_insert"
  on public.documents for insert to authenticated
  with check (public.can_write());

create policy "documents_update"
  on public.documents for update to authenticated
  using (public.can_write())
  with check (public.can_write());

-- Staff may remove a file they uploaded in error; admins may remove any.
create policy "documents_delete"
  on public.documents for delete to authenticated
  using (public.is_admin() or (public.can_write() and created_by = auth.uid()));

-- ---------------------------------------------------------------------------
-- bike_photos
-- ---------------------------------------------------------------------------

create policy "bike_photos_select"
  on public.bike_photos for select to authenticated
  using (public.can_read());

create policy "bike_photos_insert"
  on public.bike_photos for insert to authenticated
  with check (public.can_write());

create policy "bike_photos_update"
  on public.bike_photos for update to authenticated
  using (public.can_write())
  with check (public.can_write());

create policy "bike_photos_delete"
  on public.bike_photos for delete to authenticated
  using (public.is_admin() or (public.can_write() and created_by = auth.uid()));

-- ---------------------------------------------------------------------------
-- communications
-- ---------------------------------------------------------------------------

create policy "communications_select"
  on public.communications for select to authenticated
  using (public.can_read());

create policy "communications_insert"
  on public.communications for insert to authenticated
  with check (public.can_write());

-- A communication log is a record of what was said; only its author may
-- correct it, and only an admin may remove it.
create policy "communications_update_own"
  on public.communications for update to authenticated
  using (public.is_admin() or (public.can_write() and created_by = auth.uid()))
  with check (public.is_admin() or (public.can_write() and created_by = auth.uid()));

create policy "communications_delete_admin"
  on public.communications for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_logs — append-only
--
-- Deliberately no UPDATE and no DELETE policy for any role: with RLS enabled
-- and no permissive policy, those commands are denied for everyone including
-- admins. Rewriting history requires the service role, server-side.
-- ---------------------------------------------------------------------------

create policy "audit_logs_select"
  on public.audit_logs for select to authenticated
  using (public.can_read());

create policy "audit_logs_insert"
  on public.audit_logs for insert to authenticated
  with check (public.can_write());

-- ---------------------------------------------------------------------------
-- Storage policies
--
-- Both buckets are private. Object paths are namespaced by bike id
-- ("<bike_id>/<file>"), so storage access mirrors table access.
-- ---------------------------------------------------------------------------

create policy "storage_documents_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.can_read());

create policy "storage_documents_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_write());

create policy "storage_documents_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.can_write())
  with check (bucket_id = 'documents' and public.can_write());

create policy "storage_documents_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.can_write());

create policy "storage_photos_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_read());

create policy "storage_photos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_write());

create policy "storage_photos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.can_write())
  with check (bucket_id = 'photos' and public.can_write());

create policy "storage_photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.can_write());

-- ---------------------------------------------------------------------------
-- Grants
--
-- Explicit rather than relying on Supabase's default privileges. Note `anon`
-- gets nothing: this application has no public data, so an unauthenticated
-- request should fail at the grant level, before RLS is even consulted.
--
-- Revoking is not optional. Supabase's own default privileges grant `anon`
-- full table access as tables are created, so granting to other roles without
-- revoking here would leave `anon` with SELECT on everything.
-- ---------------------------------------------------------------------------

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke usage on schema public from anon;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public to authenticated;

grant all on all tables in schema public to service_role;

grant execute on all functions in schema public to authenticated, service_role;

-- Anything added by later migrations inherits the same treatment.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>> 003_indexes.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 003_indexes.sql
-- Indexes driven by the actual query patterns in PROJECT_SCOPE:
--   * dashboard aggregations (§9) group by status, insurer and location
--   * the bike list (§19) searches stock/claim/make/model and sorts by recency
--   * every child table is always read as "everything for this bike"
--   * Excel import (§19) looks up by stock_number to detect duplicates
--
-- Note: PRIMARY KEY and UNIQUE constraints already create indexes, so
-- stock_number, storage_path and the reference-table names are not repeated.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create index idx_profiles_role on public.profiles (role);
create index idx_profiles_email on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- salvage_bikes
-- ---------------------------------------------------------------------------

-- Dashboard counts and the status filter on the bike list.
create index idx_salvage_bikes_status on public.salvage_bikes (status);

-- "Bikes by Insurance" donut, and filtering a list to one insurer.
create index idx_salvage_bikes_insurance_company
  on public.salvage_bikes (insurance_company_id);

-- "Bikes by Location" summary.
create index idx_salvage_bikes_current_location
  on public.salvage_bikes (current_location_id);
create index idx_salvage_bikes_storage_location
  on public.salvage_bikes (storage_location_id);

create index idx_salvage_bikes_transporter
  on public.salvage_bikes (transporter_id);
create index idx_salvage_bikes_assigned_to
  on public.salvage_bikes (assigned_to);

-- Recent Instructions table and the default list ordering.
create index idx_salvage_bikes_date_received
  on public.salvage_bikes (date_received desc nulls last);
create index idx_salvage_bikes_created_at
  on public.salvage_bikes (created_at desc);

-- The list view hides archived rows by default; a partial index keeps that
-- common path small rather than indexing archived rows nobody queries.
create index idx_salvage_bikes_active_recent
  on public.salvage_bikes (date_received desc nulls last)
  where archived = false;

-- Claim number is looked up directly from insurer correspondence.
create index idx_salvage_bikes_claim_number
  on public.salvage_bikes (claim_number)
  where claim_number is not null;

-- Case-insensitive lookups used by the importer and the search box.
create index idx_salvage_bikes_stock_number_lower
  on public.salvage_bikes (lower(stock_number));
create index idx_salvage_bikes_vin_lower
  on public.salvage_bikes (lower(vin_number))
  where vin_number is not null;
create index idx_salvage_bikes_registration_lower
  on public.salvage_bikes (lower(registration_number))
  where registration_number is not null;

-- Free-text search across the fields the UI search box covers. GIN + trigram
-- would be an alternative, but this covers the "starts with / contains word"
-- searching the list actually does without the extra extension.
create index idx_salvage_bikes_search
  on public.salvage_bikes
  using gin (
    to_tsvector(
      'simple',
      coalesce(stock_number, '') || ' ' ||
      coalesce(claim_number, '') || ' ' ||
      coalesce(make, '') || ' ' ||
      coalesce(model, '') || ' ' ||
      coalesce(registration_number, '') || ' ' ||
      coalesce(vin_number, '')
    )
  );

-- ---------------------------------------------------------------------------
-- Child tables — always queried by parent bike
-- ---------------------------------------------------------------------------

create index idx_upliftments_bike on public.upliftments (bike_id);
create index idx_upliftments_status on public.upliftments (status);
create index idx_upliftments_transporter on public.upliftments (transporter_id);
create index idx_upliftments_date
  on public.upliftments (upliftment_date desc nulls last);

create index idx_documents_bike on public.documents (bike_id);
create index idx_documents_type on public.documents (document_type);
create index idx_documents_bike_created
  on public.documents (bike_id, created_at desc);
create index idx_documents_upliftment on public.documents (upliftment_id)
  where upliftment_id is not null;

create index idx_bike_photos_bike on public.bike_photos (bike_id);
create index idx_bike_photos_category on public.bike_photos (category);
-- The gallery renders in explicit order, newest batch last.
create index idx_bike_photos_bike_sort
  on public.bike_photos (bike_id, sort_order, created_at);

create index idx_communications_bike on public.communications (bike_id);
create index idx_communications_type on public.communications (communication_type);
-- The timeline is strictly reverse-chronological per bike.
create index idx_communications_bike_occurred
  on public.communications (bike_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs — read per bike, newest first; occasionally filtered by actor
-- ---------------------------------------------------------------------------

create index idx_audit_logs_bike_created
  on public.audit_logs (bike_id, created_at desc);
create index idx_audit_logs_actor on public.audit_logs (actor_id);
create index idx_audit_logs_action on public.audit_logs (action);
create index idx_audit_logs_record
  on public.audit_logs (table_name, record_id);

-- ---------------------------------------------------------------------------
-- Reference tables — list views exclude archived rows
-- ---------------------------------------------------------------------------

create index idx_insurance_companies_active
  on public.insurance_companies (name) where archived = false;
create index idx_transporters_active
  on public.transporters (name) where archived = false;
create index idx_locations_active
  on public.locations (name) where archived = false;
create index idx_locations_city on public.locations (city)
  where city is not null;


-- >>>>>>>>>>>>>>>>>>>> 004_revoke_anon_privileges.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 004_revoke_anon_privileges.sql
--
-- 002 granted privileges to `authenticated` and `service_role` but never took
-- anything away from `anon`. On a real Supabase project that is not enough:
-- Supabase ships default privileges that grant `anon` full table access as
-- tables are created, so `anon` retained SELECT (and more) on every table.
--
-- RLS still returned zero rows to anonymous callers, so no data was exposed —
-- but the intended defence-in-depth (fail at the grant, before RLS is even
-- consulted) was not in place. This migration makes it so.
--
-- Safe to run on a fresh database too, where it is simply a no-op.
-- ============================================================================

-- Stop future tables/functions from being granted to anon.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- Take back anything already granted.
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke usage on schema public from anon;

-- Re-assert the intended grants, in case the blanket revoke above caught
-- something these roles still need.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete
  on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>> 005_storage_constraints.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 005_storage_constraints.sql
--
-- Size and MIME limits on the storage buckets.
--
-- Files are uploaded straight from the browser to Supabase Storage rather
-- than through the Next.js server: serverless request bodies are capped
-- (4.5MB on Vercel) and a bike photo can exceed that easily. That also means
-- the server never sees the bytes, so it cannot vet them — these bucket
-- constraints are the actual enforcement point, applied by Storage itself
-- before an object is written. Client-side checks are UX only.
-- ============================================================================

update storage.buckets
   set file_size_limit = 20971520,  -- 20 MB
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv',
         'text/plain'
       ]
 where id = 'documents';

update storage.buckets
   set file_size_limit = 15728640,  -- 15 MB; phone photos run large
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
       ]
 where id = 'photos';


-- >>>>>>>>>>>>>>>>>>>> 006_import_batches.sql >>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>> 007_master_import_fields.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 007_master_import_fields.sql
--
-- Columns the client's real MSSA master workbook carries that the original
-- schema had no home for, plus provenance so an imported bike can always be
-- traced back to the row it came from.
--
-- source_row keeps the ENTIRE original spreadsheet row as JSON. The master has
-- ~120 columns, most of them an invoice/receipt ledger that Phase 1 does not
-- model. Storing the raw row means the migration is lossless today and those
-- columns can be promoted to real fields later without re-importing.
-- ============================================================================

alter table public.salvage_bikes
  add column engine_capacity_cc   integer,
  add column claims_handler       text,
  add column salvage_clerk        text,
  add column arrival_date         date,
  add column sold_to              text,
  add column selling_amount       numeric(12, 2),
  add column insurance_invoice_no text,
  add column insurance_amount     numeric(12, 2),
  add column source_row           jsonb,
  add column import_batch_id      uuid references public.import_batches (id)
                                    on delete set null;

comment on column public.salvage_bikes.source_row is
  'Verbatim spreadsheet row from the Excel import, keyed by original header. '
  'Guarantees the historical master is imported without data loss even for '
  'columns Phase 1 does not model (PROJECT_SCOPE §19).';
comment on column public.salvage_bikes.engine_capacity_cc is
  'The master workbook''s "CC" column.';

alter table public.salvage_bikes
  add constraint salvage_bikes_engine_capacity_positive
    check (engine_capacity_cc is null or engine_capacity_cc >= 0);

-- Imported bikes are looked up by batch when reviewing or undoing an import.
create index salvage_bikes_import_batch_id_idx
  on public.salvage_bikes (import_batch_id)
  where import_batch_id is not null;

-- The master's own workflow vocabulary, so imported statuses land on real
-- rows instead of being dropped. Sort order continues the 001 sequence.
insert into public.bike_statuses (code, label, sort_order, is_archived_state) values
  ('not_sold',   'Not Sold',   55, false),
  ('sold',       'Sold',       65, false),
  ('no_salvage', 'No Salvage', 75, true)
on conflict (code) do nothing;


-- >>>>>>>>>>>>>>>>>>>> 008_commission_calculation.sql >>>>>>>>>>>>>>>>>>>>

-- ============================================================================
-- 008_commission_calculation.sql
--
-- The client's real workflow (confirmed against the master workbook and by
-- the client directly): type Retail Value, type Insurance Amount ("salvage
-- value" in his words), type a commission rate he negotiates per deal — the
-- system then derives commission, VAT, and the final percentage the same way
-- Excel's "Insurance Return after comms" column does:
--
--   commission            = insurance_amount * commission_rate_percent / 100
--   total_comms_incl_vat  = commission * 1.15
--   insurance_inv_to_mssa = insurance_amount - total_comms_incl_vat
--   salvage_percentage    = insurance_inv_to_mssa / retail_value * 100
--
-- mssa_commission and salvage_percentage already exist (001) and are reused
-- here for the computed commission and final percentage — they were
-- previously dead, unwired fields; this is what wires them. Only the rate
-- itself and the two new intermediate figures need new columns.
-- ============================================================================

alter table public.salvage_bikes
  add column commission_rate_percent numeric(5, 2),
  add column total_comms_incl_vat    numeric(12, 2),
  add column insurance_inv_to_mssa   numeric(12, 2);

comment on column public.salvage_bikes.commission_rate_percent is
  'Negotiated per deal — not derivable from anything else on the bike '
  '(confirmed with the client: varies 15-32% with no pattern tied to '
  'insurer, write-off code, or retail value).';
comment on column public.salvage_bikes.total_comms_incl_vat is
  'mssa_commission with 15% VAT added, matching the master workbook''s '
  '"Total comms INCL VAT" column.';
comment on column public.salvage_bikes.insurance_inv_to_mssa is
  'insurance_amount minus total_comms_incl_vat — the net figure MSSA '
  'actually invoices, matching "INSURANCE INV to MSSA".';

alter table public.salvage_bikes
  add constraint salvage_bikes_commission_rate_range
    check (commission_rate_percent is null
           or (commission_rate_percent >= 0 and commission_rate_percent <= 100));
