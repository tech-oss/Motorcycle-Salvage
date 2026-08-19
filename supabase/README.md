# Database

SQL migrations are the source of truth for the schema. Do not create or alter
tables through the Supabase dashboard — changes made there are invisible to
this repo and will be silently clobbered by the next migration.

## Files

| File | Purpose |
|---|---|
| `migrations/001_initial_schema.sql` | Enums, tables, FKs, constraints, triggers, storage buckets |
| `migrations/002_rls_policies.sql` | Row Level Security policies, privilege guard, grants |
| `migrations/003_indexes.sql` | Indexes matched to the app's real query patterns |

## Applying migrations

**Option A — Supabase CLI (preferred).** Link the project once, then push:

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npm run db:push
```

**Option B — SQL editor.** Paste the contents of `001`, then `002`, then `003`
into the Supabase dashboard SQL editor and run them **in that order**. Later
files depend on objects created by earlier ones.

## Validating without a database

`npm run db:validate` applies all three migrations to an in-process PostgreSQL
(PGlite) with a small shim standing in for Supabase's managed `auth` and
`storage` schemas, then asserts schema shape and behaviour: role helpers,
audit triggers, constraint enforcement, the privilege-escalation guard, and
cascade deletes.

It needs no Docker, no credentials and no network. It is a fast correctness
check on the SQL itself — it does **not** exercise real Supabase Auth, real
JWT claims, or Storage, so still apply the migrations to a real project and
smoke-test sign-in before trusting a deploy.

## Creating the first admin

Every new signup is created as `viewer` — least privilege by default. That
leaves a chicken-and-egg problem for the very first administrator, which is
resolved deliberately: the privilege guard stands aside when there is no JWT,
i.e. for the service role and the SQL editor. Both are already trusted, and
anonymous API callers cannot reach it because every `profiles` policy is
granted `to authenticated` only.

So after the first person signs up, promote them from the SQL editor:

```sql
update public.profiles
   set role = 'admin'
 where email = 'you@example.co.za';
```

From then on, role changes happen in-app: an admin edits other users, and
non-admins are blocked by `guard_profile_privileges()` from changing any
`role` or `is_active` value, including their own.

## Role model

| | admin | staff | viewer |
|---|---|---|---|
| Read everything | ✓ | ✓ | ✓ |
| Create/edit bikes, upliftments, documents, photos, communications | ✓ | ✓ | — |
| Delete bikes / upliftments | ✓ | — | — |
| Delete own uploaded document/photo | ✓ | ✓ | — |
| Manage insurance companies, transporters, locations | ✓ | — | — |
| Manage users and roles | ✓ | — | — |
| Edit `audit_logs` | — | — | — |

`audit_logs` has no UPDATE or DELETE policy for anyone: with RLS enabled and
no permissive policy, those commands are denied for every role including
admin. Rewriting history requires the service role, server-side.

## Regenerating types

`src/types/database.ts` is hand-maintained so the repo stays workable without
a linked project. Once linked you can regenerate it instead:

```bash
npm run db:types
```

Either way, schema changes and type changes belong in the same commit.
