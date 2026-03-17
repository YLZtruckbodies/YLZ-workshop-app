# YLZ Workshop — System Audit (Updated March 2026)

## Architecture
- **Framework:** Next.js 14.2.35 (App Router) + React 18 + TypeScript
- **Database:** PostgreSQL (Neon serverless) via Prisma 5.22.0
- **Auth:** NextAuth v4 with PIN-based credentials
- **Styling:** Tailwind CSS 3.4.1 (dark theme, orange accent #E8681A)
- **Hosting:** Vercel
- **Key libs:** SWR (data fetch), dnd-kit (drag-drop), Recharts (charts), xlsx (Excel), ExcelJS (in HTML tools), jsPDF (in HTML tools)

## Database Models (19 tables)
| Model | Purpose | Status |
|-------|---------|--------|
| User | Staff accounts, roles, PIN auth, section assignment | Active |
| Job | Manufacturing jobs (20+ fields), stage tracking | Active |
| Worker | Workshop employees | Active |
| WorkerJob | Worker-to-job scheduling with start/days | Active |
| Tarp | Suspension/tyres/tarp status per job | Active |
| Timesheet | Time logging (4 blocks/day) | Active |
| SyncLog | Integration sync tracking | Active |
| CompletedOrder | Order completion tracking | Active |
| JobNote | Comments/holdups attached to jobs | Active |
| JobFile | File uploads per job | Active |
| ColdformKit | Hardox kit inventory (7 parts) | Active |
| ColdformChassis | Chassis order tracking | Active |
| ColdformDelivery | Kit/chassis delivery batches | Active |
| Delivery | Invoice/payment tracking | Active |
| RepairJob | Warranty/repair jobs | Active |
| JobFollowerCheck | QA checklist items | Active |
| Quote | Customer quotes with configuration + pricing | Active |
| QuoteLineItem | Line items within quotes | Active |
| PricingHistory | Historical pricing memory by config hash | Active |
| ProductTemplate | Quick quote templates with defaults | Active |

## Existing Features

### COMPLETE & WORKING
1. **Job Board (Kanban)** — Drag-drop board with production groups (issued/goahead/pending/stock/finished)
2. **Job Stages** — Requires Engineering > Ready to Start > Fab > Paint > Fitout > QC > Dispatch
3. **Keith's Schedule** — Worker scheduling with job chaining and auto-completion dates
4. **Workshop Floor** — 9 sections with team assignments and daily checklists
5. **Timesheets** — 4-block daily time logging with CSV export
6. **Job Follower** — 37-item checklist across 6 phases (localStorage)
7. **QA Checklist** — 9-item quality check per job
8. **Deliveries/Cashflow** — Invoice tracking, deposits, payment status
9. **Analytics** — Charts for hours/section/stage distribution
10. **Dashboard** — Key metrics, delivery schedule
11. **Coldform Module** — Kit/chassis/delivery management
12. **Repairs/Warranty** — Repair tracking with status
13. **Notifications** — Job notes with holdup/update/resolved types
14. **Monday.com Sync** — One-way sync (Monday > YLZ DB)
15. **Google Sheets Sync** — Bi-directional worker schedule sync
16. **Google Drive** — Job folder file listing and upload
17. **Job Sheet Creator** — Xero PDF parser > Excel generator (standalone HTML)
18. **VIN Plate Generator** — Batch VIN plate PDF generation (standalone HTML)
19. **Quote Builder** — 13-step visual configurator HTML tool (60% complete)
20. **Quote API** — Full CRUD + pricing history + templates API

### PLACEHOLDER / INCOMPLETE
1. **Quote Builder** — HTML tool complete with all configuration steps; pricing engine logic not implemented
2. **Product Templates** — API + DB model ready; seed data not populated; no UI in app
3. **Pricing Engine** — No automatic cost rollup; manual entry only
4. **Sales Module** — Client-side only, not persisted to DB

### NOT YET BUILT
1. **Visual Configurator (React)** — Image-card based product selection UI
2. **Quick Quote Templates UI** — Template selection and one-click pricing
3. **Pricing Rules Engine** — Auto-calculate from material + labour + margin
4. **BOM Management** — No BOM in DB (exists in Excel only)
5. **MRPeasy Integration** — No API connection
6. **Parts Order Forms** — No parts ordering workflow
7. **Handover/Delivery Sheets** — No document generation
8. **ABS/Compliance Outputs** — No compliance cert generation
9. **Work Order Generation** — No formal work order documents
10. **DOM Order Forms** — No parts DOM ordering

## Key Business Rules (from IMPLEMENTATION_PLAN.md)
- **Shop rate:** $150/hr flat across all sections
- **Target margin:** 25% flat
- **Pricing source:** Experience-based (Pete's head) — system will build pricing memory
- **Quote approvers:** Pete, Nathan
- **Quote creators:** Pete, Nathan, Sales team
- **Production sees pricing:** No
- **Manual overrides:** Allowed, flagged/logged with override note
- **Historical pricing:** System remembers and shows last quoted price for matching config
- **Xero:** Generate quotes that feed through Xero
- **Monday.com:** Still active, quoting should create Monday items
- **Job sheets:** Auto-create from quote, current Excel format kept
- **Parts ordering:** DOM orders, MRPeasy format
- **MRP export:** CSV for Liz
- **VIN:** Manual trigger when creating job
- **Compliance:** Engineer's cert + Weight cert, PDF format

## Integrations
| Integration | Status | Direction |
|-------------|--------|-----------|
| Monday.com | Active | Monday > YLZ (sync jobs) |
| Google Sheets | Active | Bi-directional (schedules) |
| Google Drive | Active | Read/write (job files) |
| MRPeasy | Not started | Planned — cost data + BOM |
| Xero | Indirect only | Quote PDF downloaded, manually imported |

## Standalone HTML Tools (public/)
| Tool | File | Status | Purpose |
|------|------|--------|---------|
| Quote Builder | quote-builder.html | 80% | 13-step visual configurator, PDF+Excel gen |
| Job Sheet Creator | job-sheet-creator.html | 100% | Xero PDF → Excel job sheet |
| VIN Plate Generator | vin-plate-generator.html | 100% | Batch VIN plate PDFs |
| System Questionnaire | system-questionnaire.html | N/A | Setup form |

## External Files & Templates
- `job sheet creator/Job Sheet Template Truck - REV.03.02.2026.xlsx` (102KB)
- `job sheet creator/Job Sheet Template Trailer - REV.23-10-2025.xlsx` (71KB)
- `bom reference for mrpeasy/assembly part numbers 13032026.xlsx` (BOM reference)
- `bom reference for mrpeasy/` (Xero quote examples)

## API Routes (60+)
See full inventory in JOB_SHEET_CREATOR_ANALYSIS.md.
Key quoting endpoints:
- `GET/POST /api/quotes` — quote CRUD
- `GET /api/quotes/next-number` — auto QU-0001
- `GET /api/pricing` — historical pricing lookup
- `GET/POST /api/templates` — product templates
- `POST /api/templates/seed` — seed defaults

## Reusable Modules for Quoting Extension
1. **Prisma schema** — Quote, PricingHistory, ProductTemplate already defined
2. **Job model** — type, customer, dims, material fields already there
3. **API pattern** — Consistent REST pattern for new endpoints
4. **SWR hooks** — Pattern for new data fetching
5. **Standalone HTML pattern** — Proven for tools (quote-builder, JSC, VIN)
6. **ExcelJS** — Available in HTML tools for job sheet generation
7. **jsPDF** — Available in HTML tools for quote PDF
8. **Monday.com integration** — Ready to create items on quote accept
9. **dnd-kit** — Drag-drop for configurator option reordering
10. **Auth/middleware** — Role-based access for approvals

## Key File Paths
- App pages: `app/(app)/*/page.tsx`
- API routes: `app/api/*/route.ts`
- DB schema: `prisma/schema.prisma`
- Quote builder: `public/quote-builder.html`
- Job sheet creator: `public/job-sheet-creator.html`
- VIN generator: `public/vin-plate-generator.html`
- Hooks: `lib/hooks.ts`
- Auth: `lib/auth.ts`
- Integrations: `lib/monday.ts`, `lib/sheets.ts`, `lib/drive.ts`
- Config: `next.config.mjs`, `tailwind.config.ts`
