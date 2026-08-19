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
