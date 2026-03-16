# YLZ Workshop - System Audit

## Architecture
- **Framework:** Next.js 14.2.35 (App Router) + React 18 + TypeScript
- **Database:** PostgreSQL (Neon serverless) via Prisma 5.22.0
- **Auth:** NextAuth v4 with PIN-based credentials
- **Styling:** Tailwind CSS 3.4.1 (dark theme, orange accent #E8681A)
- **Hosting:** Vercel
- **Key libs:** SWR (data fetch), dnd-kit (drag-drop), Recharts (charts), xlsx (Excel)

## Database Models (15 tables)
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

## Existing Features

### COMPLETE & WORKING
1. **Job Board (Kanban)** - Drag-drop board with production groups (issued/goahead/pending/stock/finished)
2. **Job Stages** - Requires Engineering > Ready to Start > Fab > Paint > Fitout > QC > Dispatch
3. **Keith's Schedule** - Worker scheduling with job chaining and auto-completion dates
4. **Workshop Floor** - 9 sections with team assignments and daily checklists
5. **Timesheets** - 4-block daily time logging with CSV export
6. **Job Follower** - 37-item checklist across 6 phases (localStorage)
7. **QA Checklist** - 9-item quality check per job
8. **Deliveries/Cashflow** - Invoice tracking, deposits, payment status
9. **Analytics** - Charts for hours/section/stage distribution
10. **Dashboard** - Key metrics, delivery schedule
11. **Coldform Module** - Kit/chassis/delivery management
12. **Repairs/Warranty** - Repair tracking with status
13. **Notifications** - Job notes with holdup/update/resolved types
14. **Monday.com Sync** - One-way sync (Monday > YLZ DB)
15. **Google Sheets Sync** - Bi-directional worker schedule sync
16. **Google Drive** - Job folder file listing and upload
17. **Job Sheet Creator** - PDF quote parser > Excel generator (standalone HTML)
18. **VIN Plate Generator** - Batch VIN plate PDF generation (standalone HTML)

### PLACEHOLDER / INCOMPLETE
1. **Sales Module** - Client-side only, not persisted to DB
2. **MRP Ordering** - Placeholder in engineering
3. **Drawings Management** - Placeholder
4. **Reports** - Placeholder page
5. **Sections Config** - Basic placeholder

### NOT YET BUILT
1. **Quoting System** - No quote generation
2. **Pricing Engine** - No pricing logic
3. **Configurator** - No visual product configurator
4. **BOM Management** - No BOM in codebase (exists in Excel only)
5. **MRPeasy Integration** - No API connection
6. **Parts Order Forms** - No parts ordering
7. **Handover/Delivery Sheets** - No document generation
8. **ABS/Compliance Outputs** - No compliance logic
9. **Work Order Generation** - No formal work orders
10. **Historical Pricing** - No pricing memory

## Integrations
| Integration | Status | Direction |
|-------------|--------|-----------|
| Monday.com | Active | Monday > YLZ (sync jobs) |
| Google Sheets | Active | Bi-directional (schedules) |
| Google Drive | Active | Read/write (job files) |
| MRPeasy | Not started | Planned |
| Xero | Indirect only | PDF quotes parsed client-side |

## External Files & Templates
- `Job Sheet Template Trailer - REV.23-10-2025.xlsx` (71KB)
- `Job Sheet Template Truck - REV.03.02.2026.xlsx` (102KB)
- `Hardox kits.xlsx` (59-62KB) - Kit BOM data
- `YLZ_Subframe_CutList_Final.xlsx` - Cut list data
- `assembly part numbers 13032026.xlsx` - Part number reference
- Python job sheet creator at `C:\Users\User\job sheet creator\`

## Reusable Modules
1. **Prisma schema** - Extend with Quote, Pricing, BOM models
2. **Job model** - Already has type, customer, dims, material fields
3. **API pattern** - Consistent REST pattern for new endpoints
4. **SWR hooks** - Pattern for new data fetching hooks
5. **Component library** - Button, Modal, StatusPill, Toast
6. **Auth/middleware** - Role-based access ready to extend
7. **Google Drive** - Job folder integration ready
8. **Standalone HTML pattern** - Proven for tools like job sheet creator
9. **dnd-kit** - Drag-drop infrastructure
10. **ExcelJS (in HTML tools)** - Excel generation capability

## Key File Paths
- App pages: `app/(app)/*/page.tsx`
- API routes: `app/api/*/route.ts`
- DB schema: `prisma/schema.prisma`
- Auth: `lib/auth.ts`
- Hooks: `lib/hooks.ts`
- Job types: `lib/jobTypes.ts`
- Integrations: `lib/monday.ts`, `lib/sheets.ts`, `lib/drive.ts`
- HTML tools: `public/job-sheet-creator.html`, `public/vin-plate-generator.html`
- Config: `next.config.mjs`, `tailwind.config.ts`
