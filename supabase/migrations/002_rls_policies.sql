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
