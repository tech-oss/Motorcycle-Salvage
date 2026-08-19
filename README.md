# Motorcycle Salvage Management Platform

A cloud-based platform for managing salvage motorcycle records — instructions, condition, financials, upliftment, documents, photos, and history — replacing a fragmented Excel/email/PDF workflow with one centralized, protected record per bike.

**Read [PROJECT_SCOPE.md](PROJECT_SCOPE.md) first.** It is the permanent source of truth for what this product is and, just as importantly, what Phase 1 deliberately does not include (no AI/OCR, no email/WhatsApp automation — see its scope boundary section). [ARCHITECTURE.md](ARCHITECTURE.md) covers how the system is built: route strategy, database approach, auth, and storage.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) (`new-york` style, Radix-based)
- [Supabase](https://supabase.com) — Postgres, Auth, Storage
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)
- [@react-pdf/renderer](https://react-pdf.org) for upliftment instruction PDFs
- [SheetJS `xlsx`](https://sheetjs.com) (installed from SheetJS's own CDN — see note below) for Excel import
- Deployed on [Vercel](https://vercel.com)

## Getting Started

### Prerequisites

- Node.js 20.9+ (Next.js 16 requirement)
- A Supabase project (free tier is fine for development)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your Supabase project's values (Supabase dashboard → Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

   All under **Project Settings → API Keys**. Supabase renamed these in 2025,
   so the dashboard label depends on your project's age — both work, and the
   env var names here are unaffected:

   | Variable | Dashboard label (new) | Dashboard label (legacy) | Exposed to browser? |
   |---|---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Project URL | Yes |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key `sb_publishable_…` | anon / public | Yes |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret key `sb_secret_…` | service_role | **No — server-only, bypasses RLS** |
   | `NEXT_PUBLIC_SITE_URL` | — (your deployment origin) | — | Yes |

   Legacy keys, if you need them, are on the **Legacy API Keys** tab of the
   same page.

3. Apply the database migrations — see [supabase/README.md](supabase/README.md):

   ```bash
   npx supabase link --project-ref <your-project-ref> && npm run db:push
   ```

4. Sign up in the app, then promote yourself to admin (new accounts are
   `viewer` by default). In the Supabase SQL editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.co.za';
   ```

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Available scripts

```bash
npm run dev          # start the dev server (Turbopack)
npm run build        # production build
npm run start        # run a production build locally
npm run lint         # ESLint
npm run typecheck    # TypeScript, no emit
npm run db:validate  # apply migrations to in-process Postgres and assert behaviour
npm run db:push      # apply migrations to the linked Supabase project
npm run db:types     # regenerate src/types/database.ts from the linked project
```

`db:validate` needs no Docker, credentials or network — it runs the migrations
against PGlite (Postgres compiled to WASM) with a shim for Supabase's managed
`auth`/`storage` schemas, then asserts roles, triggers, constraints and
cascades behave. Run it after any migration change.

## Authentication

Supabase Auth with email/password. Routes are gated in `src/proxy.ts` (Next.js
16's replacement for `middleware.ts`): unauthenticated requests to any
non-public route are redirected to `/login?redirect=<path>` and returned to
that path after signing in — which is what makes a QR-code scan of a bike land
on the right record.

Authorization is enforced by **Row Level Security in the database**, not by the
UI. The helpers in `src/lib/supabase/auth.ts` are for rendering and for failing
fast in Server Actions; they are not the security boundary. See
[supabase/README.md](supabase/README.md) for the role matrix.

## Project Structure

```
src/
  app/                 # App Router routes
  components/
    ui/                # shadcn/ui primitives (generated — see note below)
    layout/             # App shell: sidebar, topbar, mobile drawer nav
    dashboard/ salvage/ upliftments/ documents/ photos/ imports/
  lib/
    supabase/            # Supabase client factories (browser/server/admin)
    validations/          # Zod schemas
    pdf/                    # Upliftment PDF generation
    qr/                      # QR code generation
  hooks/
  services/                  # Data-access layer between UI and Supabase
  types/
```

See [ARCHITECTURE.md](ARCHITECTURE.md#2-application-structure) for the rationale behind this layout.

## Notes for contributors (human or AI)

- **This is Next.js 16.** Conventions differ from Next.js 15 and earlier — most notably, route protection lives in `proxy.ts` (not `middleware.ts`), and `params`/`searchParams` are async. Before writing routing code, check `node_modules/next/dist/docs/` (see `AGENTS.md`, maintained automatically by `next dev`).
- **shadcn/ui components in `src/components/ui/` are generated code.** Add more with `npx shadcn@3.8.5 add <component>` (pinned to the stable `new-york`/Radix generation — the CLI's newer "preset" styles were found to have incomplete component coverage, e.g. an empty `form` component, when this project was set up). Prefer composing generated primitives in your own components over hand-editing files in `ui/`.
- **`xlsx` is installed from SheetJS's CDN, not the npm registry.** The npm-published `xlsx` package has known, unpatched prototype-pollution/ReDoS advisories. SheetJS ships the patched build only via `https://cdn.sheetjs.com/...`. This matters directly here since the Excel import feature parses untrusted, user-uploaded files. Don't `npm install xlsx` to "fix" a version bump — reinstall from the CDN tarball instead.
- **The design system is a single committed dark/gold theme** (see PROJECT_SCOPE.md §20) — there is no light-mode toggle to preserve.
- **Do not build Phase 2 features** (AI/OCR extraction, email/WhatsApp automation, accounting integration) — see PROJECT_SCOPE.md's scope boundary before adding anything that smells like automation.

## Deployment

Deployed on Vercel. Set the same three environment variables in the Vercel project's Environment Variables settings (Production/Preview/Development as appropriate). Never set `SUPABASE_SERVICE_ROLE_KEY` without double-checking it isn't referenced from any Client Component.
