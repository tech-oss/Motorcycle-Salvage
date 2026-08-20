# PROJECT SCOPE — Motorcycle Salvage Management Platform

> This document is the permanent source of truth for what this product is, who it is for, and what Phase 1 does and does not include. Every future development session should read this file first. If a request conflicts with this document, flag the conflict before building — do not silently expand scope.

Status: Phase 1 feature-complete and end-to-end verified against the live database on 2026-08-21, including a full import of the client's real 1,764-row master workbook (§19.3).
Last updated: 2026-08-21.

---

## 1. Product Summary

A cloud-based **Motorcycle Salvage Management Platform** for a motorcycle salvage business in South Africa.

The client currently manages salvage motorcycle information using Excel workbooks, emails, PDFs, photos, and manually created upliftment documents. This platform replaces that fragmented, manual process with one centralized web application.

**Core principle: ONE BIKE = ONE CENTRAL DIGITAL RECORD.**

Every motorcycle has a single record (identified by a Stock Number, e.g. `M01188`) that holds everything about that bike in one place: identification, insurance/claim data, condition, location, financials, upliftment, photos, documents, communication notes, history, and a QR code.

## 2. The Client

- A motorcycle salvage business operating in South Africa.
- Receives salvage motorcycle instructions from **insurance companies, dealers, clients, or tow yards**.
- Manages each bike from instruction receipt through upliftment and storage/sale preparation.
- Currently relies on Excel workbooks, email, PDFs, and manual paperwork.
- Wants to migrate existing bike records from Excel into the new system.

## 3. Explicit Client Direction

> "Something basic like this can work for now and we can do manual files and pics upload."
>
> "Just need a basic data capture and file upload for now."

The client asked for a **basic first version**. Do not over-build. Manual data entry and manual file upload are the intended workflow for Phase 1 — this is a feature, not a placeholder to be embarrassed about.

## 4. Phase 1 Scope Boundary

### In scope (Phase 1)
- Manual data capture for salvage bike records
- Manual file/document upload
- Manual photo upload
- Upliftment instruction generation (auto-populated PDF from stored data)
- QR code per bike, linking to its protected record
- Authentication with role-based access (Admin / Staff / Viewer)
- Historical Excel data import
- Excel master export (added 2026-08-21 at client request — see §19.2)
- Dashboard, reporting, and the standard CRUD sections listed below

### Explicitly OUT of scope for Phase 1 — do not build

- AI extraction of any kind
- OCR
- Automatic PDF data extraction
- Automatic email processing / ingestion
- Gmail integration
- Outlook integration
- WhatsApp Business API / automatic WhatsApp messaging
- Accounting system integrations
- Advanced workflow automation
- Native mobile applications

**The architecture should stay flexible enough to add these later (see [ARCHITECTURE.md](ARCHITECTURE.md#14-future-extensibility)), but no code, UI, or schema work should be spent implementing them now.** If a task description implies one of these, stop and confirm scope before proceeding.

#### Open scope conflict — upliftment report auto-population (raised 2026-08-21)

The client asked:

> "Only documents that are not here is the actual upliftment report we get. But
> maybe there is a way that once we get that you can upload it and system will
> gather all info"

Reading a received upliftment report and populating fields from it is **OCR /
automatic PDF data extraction**, which is explicitly out of scope above. Today
the report can be uploaded and stored against the bike like any other document;
the fields are typed in. Auto-extraction needs a Phase 2 decision, not a silent
scope expansion.

## 5. Core Business Workflow

1. An insurance company, dealer, client, or tow yard issues a salvage instruction for a motorcycle.
2. Staff create a central record for the bike (Stock Number assigned).
3. Staff capture insurance, claim, insured party, assessor, motorcycle, and condition data.
4. Staff upload supporting documents and photos as they arrive.
5. Staff generate an upliftment instruction PDF (auto-populated from the bike record) and hand it to a transporter manually (print/download/share — no automated dispatch).
6. Staff track the bike through upliftment, transit, receipt, and storage.
7. Staff log manual communication (calls, emails, WhatsApp, notes) against the bike.
8. Every meaningful change is recorded in an audit history.
9. Once processed, the bike is marked ready for sale, and eventually archived.

## 6. Existing Data & Migration

- The client has existing Excel files with master data and per-bike data.
- **Excel import is a mandatory Phase 1 feature**, not a nice-to-have.
- Import must let the client migrate historical bikes into the platform without data loss or silent overwrites.

## 7. Users & Roles

Authentication is required for all access to bike records.

| Role | Access |
|---|---|
| **Admin** | Full access. User management. Data import. System configuration. Create/edit/delete/archive bikes. Manage insurance companies, transporters, and locations. |
| **Staff** | Operational access. Create/edit bikes. Upload documents and photos. Manage upliftments. Generate PDFs. Add communication notes. |
| **Viewer** | Read-only access to all records. |

## 8. Application Sections

1. Dashboard
2. Salvage Bikes
3. Upliftments
4. Documents
5. Transporters
6. Insurance Companies
7. Locations
8. Reports
9. Data Import
10. Users
11. Settings

## 9. Dashboard

Displays (all values come from the database — no mock/static numbers):

- Total Bikes
- New Instructions
- Upliftments
- In Transit
- Ready for Sale

Plus:

- **Recent Instructions** table — columns: Stock No., Claim No., Make / Model, Insurance, Received, Status
- **Bikes by Insurance** (visual summary)
- **Upliftment Status** (visual summary)
- **Bikes by Location** (visual summary)

## 10. Salvage Bike Record

The bike record is translated into a **clean relational schema** — it should not blindly mirror the client's Excel column layout. Group by domain, not by spreadsheet habit. See [ARCHITECTURE.md](ARCHITECTURE.md#4-database-approach) for the relational breakdown of the fields below.

### Identification
Stock number, file number, claim number, status.

### Insurance
Insurance company, broker, assessor, assessor contact, insured name, insured address, insured phone, insured email.

### Motorcycle
Make, model, year, registration number, VIN, odometer, colour, engine number, keys status, write-off code, loss date.

### Condition
Pre-accident condition, severity of impact, pre-accident damage, tyre condition, tyre depth (left front / right front / left rear / right rear).

### Location
Collection location, collection contact, collection phone, delivery location, current location, storage location.

### Financial
Retail value, salvage value, salvage percentage, commission, release fee, release payment date, total loss, estimator cost.

### Upliftment
Transporter, contact person, contact number, upliftment date, upliftment time, upliftment sent date, upliftment received date, pickup address, delivery address, notes.

### Administrative
Date received, assigned user, notes, created at, updated at, created by, updated by, archived.

## 11. Bike Detail Page

Every bike record has these tabs/sections:

- **Overview** — Vehicle Information, Insurance/Assessor, Location, Financial Summary
- **Documents** — the bike's document library
- **Photos** — the bike's photo library
- **Upliftment** — upliftment instruction data and generated PDFs
- **Invoices / Financial** — financial documents and figures
- **Communication** — manual communication timeline
- **History** — audit trail

## 12. Documents

Document types: Insurance Report, Release Invoice, Transport Invoice, POP (Proof of Payment), Purchase Agreement, Upliftment Instruction, Other.

Capabilities: upload, preview where possible, download, delete, rename, categorize.

All processing is manual — staff choose the type and upload the file. No automatic classification or extraction.

## 13. Photos

Manual upload only. Suggested categories: front, rear, left, right, odometer, VIN, engine, damage, other.

Capabilities: thumbnails, fullscreen view, delete, download, optional category tag. Stored in Supabase Storage.

## 14. Upliftment Instructions

- Staff create an upliftment instruction using data already captured on the bike record — the system auto-populates the document from existing fields (no re-typing).
- The system generates a professional PDF.
- The PDF is downloaded/printed/shared **manually** by staff.
- No WhatsApp automation, no automatic dispatch, no email-out. That is future scope.

## 15. QR Codes

- Every bike gets a QR code pointing to its record, e.g. `https://yourdomain.com/bikes/M01188`.
- The bike page is **protected**: an unauthenticated visitor scanning the code is sent to login first, then returned to the bike record after authenticating.
- The QR sticker must be printable/downloadable (e.g. as an image or as part of a label PDF).

## 16. Communication Log

A simple, manual communication timeline per bike.

Types: Email, Phone, WhatsApp, Internal Note, Other.

Fields: date, type, from, to, note, created by.

This is a log staff type into manually — not an inbox, not a connected channel.

## 17. Audit History

Track meaningful changes per bike: created, edited, status changed, document uploaded, photo uploaded, archived, restored, deleted.

Each entry shows: user, action, timestamp, old value (where applicable), new value (where applicable).

## 18. Status Workflow

Minimum status set (expandable later, so it must be modeled as data, not a hardcoded enum baked into UI logic):

1. New Instruction
2. Upliftment Pending
3. Scheduled
4. In Transit
5. Received
6. Ready for Sale
7. Archived

## 19. Data Import

A dedicated, mandatory **Data Import** section.

Workflow:

```
Upload Excel (.xlsx)
  → Select worksheet
  → Detect columns
  → Map columns to system fields
  → Preview
  → Validate
  → Detect duplicates (by Stock Number)
  → Confirm
  → Import
  → Show results
```

Rules:
- Stock number is the primary business key used to detect duplicates.
- **Never silently overwrite existing data.** Conflicts must be surfaced to the user for a decision.
- Results must clearly report: imported, updated, skipped, invalid, duplicates.
- Provide a downloadable import template.

### 19.1 The client's real master workbook (verified 2026-08-21)

The client supplied `08 MSSA Master Aug 2026.xlsx`. What it actually contains,
and what the importer had to be built to handle:

- **Two worksheets with different column sets**: `Bryte & Hollard` (121 columns,
  1,479 rows) and `Alpha` (102 columns, 285 rows, "IUM" naming). Import one
  sheet at a time; mapping is per sheet.
- **The header row is not row 1.** A title banner ("MSSA SALVAGE MASTER") sits
  above it. The importer auto-detects the header row and lets the user override.
- **Accounting formatting**: money arrives as `" 56,521.74 "`, `" -   "` (blank),
  `"51%"`, `"R29,900.00"`, `"(1,234.00)"` (negative).
- **Date formats**: `15-Nov-18`, `Nov-18` (month only), `7/3/2019` (D/M/Y),
  `15 July 2026`, `Monday, August 03, 2026`.
- **Header typos are real data**: the Alpha sheet's stock column is literally
  headed `Stock Nosuzu`.
- **210 + 37 rows have no stock number** — blank spacer rows, correctly skipped.
- Importable total: **1,517 bikes** (1,269 + 248).

Because ~90 of those columns are an invoice/receipt ledger that Phase 1 does not
model, every imported bike stores its **entire original row** in
`salvage_bikes.source_row` (jsonb). The historical import is therefore lossless
today, and those columns can be promoted to real fields later without
re-importing.

Insurance companies in scope: **Hollard, Bryte, Alpha**. Brokerages appear in the
Insurance Company / Broker columns and are created on import as encountered.

### 19.3 End-to-end verification (2026-08-21)

Phase 1 was exercised against the live Supabase project with the client's real
workbook. Result: **1,517 bikes imported** (1,263 from `Bryte & Hollard`, 248
from `Alpha`, 6 pre-existing records correctly left untouched), 247 blank
spacer rows skipped, 0 rows lost.

Four defects were found only by running at real scale, and fixed:

1. **PostgREST's 1,000-row cap** silently truncates any select without an
   explicit range. The bike list showed "1000 entries" when 1,517 existed,
   dashboard charts under-counted, and duplicate detection stopped seeing
   existing bikes past the first thousand. All unbounded reads now page
   (`lib/supabase/paginate.ts`).
2. **Bulk inserts fail on mixed keys.** PostgREST fills a key missing from one
   object in an array with NULL rather than the column default, so a page
   mixing rows with and without a status violated NOT NULL and fell back to
   100 single-row inserts (22s per chunk). Payloads are now uniform.
3. **The wrong column won an auto-mapping.** "Trade", "Retails" and "Retail"
   all look like a retail value; the first match won, and it was the nearly
   empty one — 987 bikes imported with no retail value. The most-populated
   candidate now wins.
4. **`source_row` was not actually lossless.** Keyed by header name, the
   master's repeated headers ("Paid" ×9, "Amount" ×8) overwrote each other and
   38 of 121 columns vanished. Repeats now carry their column position.

Also verified: RLS denies every viewer write path (insert/update/delete,
document insert, storage upload, self-promotion to admin) and the export
endpoint returns 403 for a viewer even when called directly; anonymous callers
get nothing from any table or bucket; dates round-trip exactly; the upliftment
PDF renders, uploads, and links to both an upliftment and a document row; and
an import is fully reversible by deleting on `import_batch_id`.

### 19.2 Excel master export (client requirement)

> "The program needs to export to an Excel anyway... We must keep a master."

`GET /api/exports/master` builds an .xlsx using the client's own column names and
tab structure (`Bryte & Hollard`, `Alpha`, `Other`). Verified round-trip: exporting
1,269 imported bikes and re-importing the result reproduces every field
identically. Restricted to admin and staff; never cached.

## 20. Design System

The client has approved a premium visual concept. This is the **visual source of truth** — the app must not read as a generic admin template.

Tone: premium, dark, automotive, modern SaaS. Subtle borders, rounded cards, generous spacing, clean tables, modern badges, elegant charts, polished forms.

### Palette

| Token | Hex | Use |
|---|---|---|
| Background | `#071018` | App background |
| Sidebar | `#0B131D` | Sidebar / nav surface |
| Card | `#101A25` | Card / panel surface |
| Primary | `#D6A23A` | Gold/amber accent, primary actions |
| Text | `#F5F7FA` | Primary text (white) |
| Secondary | `#94A3B8` | Secondary/muted text |
| Border | `#243241` | Borders, dividers |

See [ARCHITECTURE.md](ARCHITECTURE.md#10-design-tokens) for how these are wired into Tailwind/shadcn theme tokens.

## 21. Responsiveness

Fully responsive across:

- **Desktop**: 1440px+
- **Tablet**: 768–1439px
- **Mobile**: 320–767px

Mobile requires purpose-built layouts, not shrunk desktop ones: drawer navigation, stacked cards, responsive forms, mobile-friendly upload, responsive tables (card-based on small screens), touch-friendly controls.

## 22. Technology Stack

- Next.js (latest stable, App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Supabase (PostgreSQL, Auth, Storage)
- React Hook Form + Zod
- Deployed on Vercel

Dependencies are kept lean — no library is added without a concrete Phase 1 use.

## 23. Future Scope (explicitly not built now)

- AI document extraction / OCR
- Automatic email ingestion (Gmail/Outlook)
- Insurance-specific data extraction
- WhatsApp Business API integration
- Automatic notifications
- Advanced workflow automation
- Accounting system integrations

The architecture is intentionally structured (see [ARCHITECTURE.md](ARCHITECTURE.md#14-future-extensibility)) so these can be layered in later without a rewrite — e.g. documents already carry a `source` concept that can later distinguish "manually uploaded" from "auto-ingested."

---

## Change Log

- 2026-08-19 — Initial scope document created; project foundation (Next.js app shell, design system, docs) established. No business modules built yet.
- 2026-08-19 — Client's approved UI mockup received (6 screens: Dashboard, Salvage Bike List, Bike Details, Data Import, Documents & Photos, QR Code Sticker). Built all six against a typed fixture-data layer pending the Supabase connection.
- 2026-08-19 — Supabase backend built (migrations, RLS, auth) and connected. Fixture layer replaced by real queries in `services/*`; see [ARCHITECTURE.md](ARCHITECTURE.md#13-data-access-layer).
