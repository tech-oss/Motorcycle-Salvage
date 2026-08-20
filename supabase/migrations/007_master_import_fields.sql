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
