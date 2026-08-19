-- ============================================================================
-- Diagnostic — paste into the Supabase SQL Editor, run, paste results back.
-- Read-only: changes nothing.
-- ============================================================================

-- Q1. Who am I when I run SQL here, and who owns the tables?
select
  current_user                                   as sql_editor_runs_as,
  session_user                                   as session_user,
  (select tableowner from pg_tables
    where schemaname = 'public' and tablename = 'salvage_bikes') as table_owner;

-- Q2. Which privileges does anon still hold, and CRUCIALLY who granted them?
-- A REVOKE only removes grants made by the role issuing it, so if `grantor`
-- is not the role from Q1, that is exactly why 004 had no effect.
select grantor, grantee, table_name, privilege_type
  from information_schema.role_table_grants
 where grantee = 'anon'
   and table_schema = 'public'
   and table_name in ('salvage_bikes', 'insurance_companies')
 order by table_name, privilege_type;

-- Q3. Overall counts.
select
  (select count(*) from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public')          as anon_grants,
  (select count(*) from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public') as authenticated_grants,
  has_schema_privilege('anon', 'public', 'USAGE')                as anon_schema_usage,
  (select count(*) from auth.users)                              as auth_users,
  (select count(*) from public.profiles)                         as profiles;
