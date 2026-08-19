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
