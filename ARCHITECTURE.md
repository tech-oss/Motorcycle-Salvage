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

PostgreSQL via Supabase. The bike record is **normalized into a relational schema**, not stored as one wide Excel-shaped table. Proposed core tables (to be finalized when the Salvage Bikes module is built):

- `bikes` — identification, motorcycle, condition, financial, and administrative fields that are 1:1 with a bike
- `insurance_companies` — referenced by `bikes.insurance_company_id`
- `transporters` — referenced by `bikes.transporter_id`
- `locations` — referenced by `bikes.collection_location_id` / `current_location_id` / `storage_location_id` (a location is reused across bikes, so it's a lookup table, not free text)
- `documents` — one row per uploaded file, `bike_id` FK, `type`, storage path, uploaded_by, uploaded_at
- `photos` — one row per uploaded photo, `bike_id` FK, optional `category`, storage path
- `communications` — one row per manual communication log entry, `bike_id` FK, `type`, `from`, `to`, `note`, `created_by`
- `audit_log` — one row per tracked change, `bike_id` FK, `user_id`, `action`, `old_value`, `new_value`, `created_at`
- `statuses` — a small reference table for the status workflow (not a hardcoded enum), so new statuses can be added without a schema migration touching application code
- `users` / `profiles` — extends Supabase `auth.users` with `role` (admin/staff/viewer) and display info
- `import_batches` / `import_rows` — tracks each Excel import run and the per-row outcome (imported/updated/skipped/invalid/duplicate) for auditability

Insurance companies, transporters, and locations are **lookup tables**, not free-text columns — this directly serves the "Bikes by Insurance" / "Bikes by Location" dashboard summaries and the Admin-managed Insurance Companies/Transporters/Locations sections.

Row Level Security (RLS) is enabled on every table. Policies are role-aware (admin/staff/viewer) and are the actual enforcement layer — the app's role checks in UI/Server Actions are a UX convenience, not the security boundary.

## 5. Storage Approach

Supabase Storage, two buckets to start:

- `documents` — insurance reports, invoices, POPs, agreements, upliftment instructions, etc.
- `photos` — bike photos

Objects are path-namespaced by bike, e.g. `documents/{bike_id}/{document_id}-{filename}`, so storage policies can mirror table RLS (a user who can't read a bike's row also can't read its files). Buckets are private; access is via signed URLs generated server-side, never public buckets.

## 6. Authentication & Authorization

- **Supabase Auth** (email/password to start — the client did not ask for SSO/social login).
- Session enforcement happens in `proxy.ts`: unauthenticated requests to any `(app)` route are redirected to `/login?redirect=<original-path>`, and login redirects back — this is exactly the QR code flow (scan → login → land on the bike record).
- A `profiles` table stores `role: 'admin' | 'staff' | 'viewer'` per user, set by an Admin via the Users section.
- Authorization is enforced at two layers:
  1. **RLS policies** in Postgres — the real boundary.
  2. **UI/Server Action checks** — hide/disable actions the role can't perform, and defense-in-depth validation before mutations.

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

## 13. Future Extensibility

The system is deliberately shaped so Phase 2+ features attach without restructuring Phase 1:

- **AI/OCR document extraction**: `documents` rows already have a `type` and a storage path; a future extraction job is just a background process that reads a document row and writes structured fields back — it doesn't need the documents model to change.
- **Automatic email/WhatsApp ingestion**: would create bikes/documents/communications through the same `services/*` functions the UI already calls — the service layer is the integration seam, not raw DB access scattered through the app.
- **Notifications/automation**: the `statuses` table and `audit_log` already model state transitions as data, which is what a future automation/notification engine would key off of.
- **Accounting integration**: financial fields are already isolated on the bike record and would map cleanly to an export/sync job.

None of this is built now — it's called out so Phase 1 schema/service decisions don't accidentally block it later.
