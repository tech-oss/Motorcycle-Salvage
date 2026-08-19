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
