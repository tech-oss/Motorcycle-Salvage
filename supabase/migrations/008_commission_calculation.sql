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
