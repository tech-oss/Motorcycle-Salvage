# ARCHITECTURE — Motorcycle Salvage Management Platform

Companion to [PROJECT_SCOPE.md](PROJECT_SCOPE.md). That file defines *what* we're building; this file defines *how*. Read PROJECT_SCOPE.md first.

---

## 1. High-Level Architecture

A single Next.js application (App Router) deployed to Vercel, backed entirely by Supabase (Postgres + Auth + Storage). No separate backend service in Phase 1 — server-side logic lives in Next.js Server Components, Server Actions, and Route Handlers, talking to Supabase via its server-side client.

```
Browser
  │
  ▼
Next.js App Router (Vercel)
  ├─ Server Components  ──┐
  ├─ Server Actions       ├──►  Supabase (Postgres, Auth, Storage)
  ├─ Route Handlers       │
  └─ Client Components ───┘  (browser Supabase client, RLS-enforced)
```

Rationale: the client explicitly asked for a basic, low-overhead system. A single deployable app with a managed backend (Supabase) minimizes operational surface area while still being a real production architecture — not a prototype that needs to be thrown away.

## 2. Application Structure

```
src/
  app/                      # App Router routes (pages, layouts, route handlers)
  components/
    ui/                     # shadcn/ui primitives (generated, treated as vendored)
    layout/                 # App shell: sidebar, topbar, mobile drawer
    dashboard/              # Dashboard-specific components
    salvage/                # Salvage bike record components
    upliftments/             # Upliftment instruction components
    documents/               # Document library components
    photos/                   # Photo library components
    imports/                  # Excel import wizard components
  lib/
    supabase/                # Supabase client factories (browser/server/admin)
    validations/              # Zod schemas (forms + import mapping)
    utils/                     # Generic helpers (cn, formatters, etc.)
    pdf/                        # Upliftment PDF generation (@react-pdf/renderer)
    qr/                          # QR code generation helpers
  hooks/                          # Shared React hooks
  services/                       # Data-access layer (typed queries/mutations, one module per domain)
  types/                           # Shared TypeScript types (mirrors DB schema)
```

`services/` is the boundary between UI and Supabase: components and Server Actions call into `services/*` rather than issuing raw Supabase queries inline. This keeps query logic testable and swappable, and is the seam future phases (e.g. an ingestion pipeline that also needs to write bike records) will plug into.

## 3. Route Strategy

App Router, grouped by access level:

```
app/
  (auth)/
    login/page.tsx
    ...
  (app)/                      # authenticated app shell (layout enforces session)
    dashboard/page.tsx
    bikes/
      page.tsx                # list
      [stockNumber]/page.tsx  # bike detail (Overview/Documents/Photos/Upliftment/Financial/Communication/History as tabs, not separate routes, to keep the record feeling like ONE record)
      new/page.tsx
    upliftments/page.tsx
    documents/page.tsx
    transporters/page.tsx
    insurance-companies/page.tsx
    locations/page.tsx
    reports/page.tsx
    imports/page.tsx
    users/page.tsx
    settings/page.tsx
  api/
    ...route handlers for things that must be HTTP endpoints (webhooks-shaped work, PDF streaming, etc.)
```

Notes for **Next.js 16** (this project was scaffolded on 16.3.1 — conventions differ from earlier training-data assumptions; consult `node_modules/next/dist/docs/` before assuming behavior):

- `params` and `searchParams` are **async** (`Promise`-based) in pages, layouts, and route handlers. Use the generated `PageProps`/`LayoutProps` helpers (`npx next typegen`).
- Route protection is implemented in **`proxy.ts`** at the project root, not `middleware.ts` — the `middleware` convention is deprecated in favor of `proxy` (Node.js runtime only, no Edge runtime).
- Parallel route slots require an explicit `default.js`. We are not using parallel routes in Phase 1, so this doesn't apply yet, but keep it in mind if a modal-via-parallel-route pattern is introduced later.

The bike detail page (`bikes/[stockNumber]`) uses **tabs within one route**, backed by the Stock Number as the URL key — reinforcing "one bike = one record" rather than splitting the bike across multiple pages. The QR code target (`/bikes/M01188`) is exactly this route.

## 4. Database Approach

PostgreSQL via Supabase. The bike record is **normalized into a relational schema**, not stored as one wide Excel-shaped table. Migrations under `supabase/migrations/` are the source of truth — nothing is created through the dashboard. See [supabase/README.md](supabase/README.md) for how to apply and validate them.

Implemented tables:

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with `role` (admin/staff/viewer), `is_active`, display info |
| `bike_statuses` | Workflow states as **data**, so the workflow extends without a code change |
| `insurance_companies` | Lookup, referenced by `salvage_bikes.insurance_company_id` |
| `transporters` | Lookup, referenced by `salvage_bikes.transporter_id` and `upliftments` |
| `locations` | Lookup for collection/delivery/current/storage |
| `salvage_bikes` | The one central record: identification, insurance, motorcycle, condition, location, financial, upliftment, administrative |
| `upliftments` | History of upliftment instructions issued per bike |
| `documents` | One row per uploaded file, `bike_id` FK, type, storage path |
| `bike_photos` | One row per photo, `bike_id` FK, category, storage path |
| `communications` | Manual communication timeline per bike |
| `audit_logs` | Append-only change history |

Decisions worth knowing:

- **Status is a lookup table, not an enum.** PROJECT_SCOPE §18 requires an expandable workflow, so `salvage_bikes.status` is text with an FK to `bike_statuses(code)`. The column keeps the name the brief specified while staying extensible by inserting a row.
- **Small stable sets are enums** (`document_type`, `photo_category`, `communication_type`, `keys_status`, `user_role`) — cheaper than a table, and still extendable via `ALTER TYPE ... ADD VALUE`.
- **Location is stored both ways.** `collection_location` (text, as captured) sits alongside `collection_location_id` (FK). Historical Excel rows arrive as free text that may not match any known location, so the text is preserved verbatim while the FK powers reporting.
- **Money is `numeric`, never float.**
- **`created_by`/`updated_by`/`updated_at` are set by trigger** from `auth.uid()`, so a client cannot spoof authorship.
- **Bike creation, status changes and archive/restore are audited by trigger**, so the trail doesn't depend on the application remembering to write one.
- `import_batches` / `import_rows` are **not built yet** — they belong with the Excel import module.

Row Level Security is enabled on every table and is the actual enforcement layer; the app's role checks are a UX convenience, not the security boundary. Policies are written against `SECURITY DEFINER` helper functions (`is_admin()`, `can_write()`, `can_read()`) — a non-definer function would re-enter the very `profiles` policies that call it and recurse forever.

`anon` is granted **nothing** on the public schema: this application has no public data, so an unauthenticated request fails at the grant level before RLS is consulted.

## 5. Storage Approach

Supabase Storage, two buckets to start:

- `documents` — insurance reports, invoices, POPs, agreements, upliftment instructions, etc.
- `photos` — bike photos

Objects are path-namespaced by bike, e.g. `documents/{bike_id}/{document_id}-{filename}`, so storage policies can mirror table RLS (a user who can't read a bike's row also can't read its files). Buckets are private; access is via signed URLs generated server-side, never public buckets.

## 6. Authentication & Authorization

- **Supabase Auth** (email/password — the client did not ask for SSO/social login). Implemented flows: login, signup, forgot password, reset password, sign out.
- Session enforcement happens in **`src/proxy.ts`** (Next.js 16's rename of `middleware.ts`): unauthenticated requests to any non-public route are redirected to `/login?redirect=<original-path>` and returned there after signing in — this is exactly the QR code flow (scan → login → land on the bike record).
- The proxy calls `supabase.auth.getUser()`, never `getSession()`. `getSession()` only decodes the cookie, which the client controls; `getUser()` revalidates with Supabase.
- `handle_new_user()` creates the `profiles` row on signup, defaulting to **`viewer`** — least privilege. An admin promotes from there.
- `guard_profile_privileges()` blocks non-admins from changing any `role` or `is_active`, including their own, closing the self-promotion hole that a plain "users may edit their own profile" policy would otherwise leave open. RLS `WITH CHECK` cannot compare against the previous row, so this has to be a trigger.
- The guard stands aside when `auth.uid()` is null (service role / SQL editor). That is deliberate: it is the only way the **first** admin can be created, and anonymous callers cannot reach it because every `profiles` policy is `to authenticated`.
- Authorization is enforced at two layers:
  1. **RLS policies** in Postgres — the real boundary.
  2. **UI/Server Action checks** (`src/lib/supabase/auth.ts`) — hide actions a role can't perform and fail fast, as defence in depth.
- Login errors distinguish rejected credentials (generic message, so the endpoint can't be used to enumerate registered emails) from an unreachable backend (says so plainly, so a misconfiguration isn't mistaken for a typo). `forgotPassword` always reports success for the same anti-enumeration reason.

## 7. PDF Generation (Upliftment Instructions)

`@react-pdf/renderer` builds the upliftment instruction PDF from the bike record's existing fields (transporter, contact, addresses, dates, bike identification) — no separate data entry step. Generation happens server-side (Server Action or Route Handler) and returns a downloadable file; there is no automatic sending.

## 8. QR Codes

`qrcode` generates a QR image encoding `https://<domain>/bikes/{stockNumber}`. Generated on demand (bike detail page) and offered as a downloadable/printable asset (PNG or as part of a label layout). No stored QR image is required as a source of truth — it's always regenerable from the stock number.

## 9. Excel Import

Uses the SheetJS `xlsx` package **installed from SheetJS's own CDN** (`https://cdn.sheetjs.com/...`), not the `xlsx` npm registry package — the npm-published version has known unpatched prototype-pollution/ReDoS advisories with no fix on npm; SheetJS ships the patched build only via their CDN/direct install. This matters here because the import pipeline parses untrusted, user-uploaded files.

Import is a multi-step wizard (see PROJECT_SCOPE.md §19): upload → sheet select → column detect → column mapping (persisted as a reusable template per Admin) → preview → validation (Zod schemas) → duplicate detection by Stock Number → confirmation → import → results. Each run is recorded in `import_batches`/`import_rows` so results are auditable after the fact, not just shown once and discarded.

## 10. Design Tokens

The approved palette is wired in as CSS variables consumed by Tailwind v4 (`@theme`) and mapped onto shadcn/ui's theme tokens (`background`, `card`, `primary`, `foreground`, `muted-foreground`, `border`, etc.) so every generated shadcn component inherits the premium dark/gold theme automatically rather than needing per-component overrides.

| Token | Hex |
|---|---|
| Background | `#071018` |
| Sidebar | `#0B131D` |
| Card | `#101A25` |
| Primary (gold) | `#D6A23A` |
| Text | `#F5F7FA` |
| Secondary text | `#94A3B8` |
| Border | `#243241` |

## 11. Responsiveness Strategy

Mobile-first Tailwind breakpoints, with the app shell itself branching behavior (not just spacing) at the tablet boundary:

- `< 768px` (mobile): drawer/sheet navigation (shadcn `Sheet`), stacked single-column layouts, list views render as cards instead of tables.
- `768–1439px` (tablet): collapsible sidebar, tables with reduced/priority columns.
- `≥ 1440px` (desktop): full sidebar, full data tables.

## 12. Environment & Secrets

See `.env.example`. Three Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL` — safe client-side.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe client-side, RLS-enforced.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never imported into any Client Component or exposed to the browser. Used only inside `lib/supabase/admin.ts`-style server-only modules (e.g. for Admin operations that must bypass RLS, such as user management).

## 13. Data Access Layer

Components never query Supabase directly. Every read goes through `services/*`,
which returns plain camelCase objects defined in `types/bike.ts`:

- `services/bikes.ts` — list and detail queries, plus the mapping from
  snake_case rows (with embedded joins for insurer, transporter, documents,
  photos, communications and upliftments) to the domain shapes the UI renders.
- `services/dashboard.ts` — the §9 aggregations. Counts use PostgREST's
  `head: true` + `count: 'exact'` so the database counts and no rows cross the
  wire. Archived bikes are excluded everywhere, since the dashboard describes
  live operations.

This keeps the query layer swappable and the components trivially testable,
and it is the seam future ingestion paths (§14) attach to rather than
duplicating write logic.

Two deliberate omissions, so nothing on screen is invented:

- **No trend percentages.** The mockup showed "+12% vs last month", but there
  is no historical snapshot to compute that from. Stat cards show the count
  alone until period-over-period data exists.
- **Recent Imports is an empty state.** `import_batches` / `import_rows` are
  not built yet, so the page says so rather than listing a history that never
  happened.

Photo and document thumbnails are placeholders because both buckets are
private — rendering a real image needs a server-side signed URL, which lands
with the upload feature.

`scripts/seed.mjs` populates the linked project with realistic demo data
(6 bikes, 5 insurers, 3 transporters, 4 locations, communications). It uses
the service role key, so it is a development tool the app never calls.
Re-runnable; `--clear` removes what it inserted.

## 14. Future Extensibility

The system is deliberately shaped so Phase 2+ features attach without restructuring Phase 1:

- **AI/OCR document extraction**: `documents` rows already have a `type` and a storage path; a future extraction job is just a background process that reads a document row and writes structured fields back — it doesn't need the documents model to change.
- **Automatic email/WhatsApp ingestion**: would create bikes/documents/communications through the same `services/*` functions the UI already calls — the service layer is the integration seam, not raw DB access scattered through the app.
- **Notifications/automation**: the `statuses` table and `audit_log` already model state transitions as data, which is what a future automation/notification engine would key off of.
- **Accounting integration**: financial fields are already isolated on the bike record and would map cleanly to an export/sync job.

None of this is built now — it's called out so Phase 1 schema/service decisions don't accidentally block it later.
