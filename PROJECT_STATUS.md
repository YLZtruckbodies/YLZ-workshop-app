# YLZ Workshop — Project Status
*Last updated: March 2026*

## Current Phase: AWAITING IMPLEMENTATION APPROVAL

Discovery complete. Questionnaire answered. Implementation plan presented to Nathan.
Waiting for go-ahead to begin building.

Pricing numbers (sent to Pete separately) still outstanding — will seed templates when received.
All other information is sufficient to begin implementation.

---

## Confirmed Facts (from Nathan/Pete questionnaire)

| Topic | Answer |
|-------|--------|
| V.Orlandi | Italian branded tow coupling (not a hoist) |
| CT on job sheet | Chris (surname TBC) |
| PS = salesperson | Pete S (sales manager) |
| Pricing visible to | Pete, Nathan, Sales team, Wendy |
| Quote approval | Pete OR Nathan must approve before sending |
| Quote delivery | Either — system email or manual download |
| Auto on quote accept | Job board + MRPeasy MO + Email job sheet to workshop |
| Job starting stage | Requires Engineering |
| Job sheet generation | Engineer reviews first (not auto) |
| Combo job sheets | Two separate (truck + trailer) |
| Engineering fields | Stay on job sheet, NOT in configurator |
| Truck brand vs price | Brand doesn't change price — dimensions only |
| Truck dims at quote | Sometimes known, sometimes TBD |
| Templates | 3 current; system must support more without rebuild |
| Customer/dealer entry | Standard list + free text for new |
| Drawing number | Field on job, populated later (not system-generated) |
| Section sign-offs | Yes — each production section needs sign-off on job sheet |
| BOM in MRPeasy | Already set up for 3 builds ✅ |
| Hardox plate supplier | SSAB |
| Hoist supplier | TES (Binnotto hoists) |
| Tarp supplier | Camelliri Tarps |
| Axle supplier | SAF |
| Parts order form | Covers both raw materials + purchased components |
| MRPeasy import | Liz imports a form (does not create from scratch) |
| VIN/compliance timing | During fabrication, when serial number assigned |
| Engineer's cert | Third-party — CVC (Commercial Vehicle Compliance) |
| Weight cert | Weighbridge (physical weighing) |
| VIN plate generator | Already built — link to it, don't duplicate |
| Handover sheet timing | Prepared in advance |
| Handover contents | Customer details, full spec, warranty info |
| Warranty period | 2 years on workmanship |
| Monday.com plan | Replace eventually with this system |
| #1 time-saver | Auto job + MRPeasy MO on quote acceptance |
| Go-live target | ASAP |

---

## Still Awaiting

| Item | Who | Notes |
|------|-----|-------|
| Base prices (3 templates) | Pete | Sent separately |
| Standard sheet specs (Hardox tipper) | Pete | In pricing email |
| Lead times | Pete | In pricing email |
| Payment terms | Pete | In pricing email |
| Hoist model name (Binnotto range) | Nathan | For JSC dropdown update |
| Camelliri tarp model names | Nathan | For JSC dropdown update |
| MRPeasy import format (Liz) | Liz | For BOM export format |
| CVC cert format/fields | Nathan | For compliance output |
| CT's full surname | Nathan | Minor |

---

## What Is Live (Production)
- Job Board, Job Stages, Keith's Schedule, Floor, Timesheets
- QA, Deliveries/Cashflow, Analytics, Coldform, Repairs
- Notifications, Monday.com sync, Google Sheets, Google Drive
- Job Sheet Creator, VIN Plate Generator, Quote API

## What Is Partially Built
- Quote Builder HTML (80%) — configurator working, pricing not wired
- Product Templates (50%) — API/DB ready, no seed data, no UI

## What Will Be Built (Implementation Plan)

### Sprint 1 — Foundation
- Update suppliers/options in JSC (Binnotto, Camelliri, SAF)
- Seed Quick Quote templates (prices TBC from Pete)
- Add MRPeasy cache DB models
- Image directory structure + placeholders

### Sprint 2 — Configurator
- Image-card product selection page
- Guided configurator (sales-facing fields only, 12 sections)
- Pricing display + historical lookup
- Manual override with approval flag

### Sprint 3 — Documents
- Quote PDF (jsPDF, YLZ letterhead)
- Auto job sheet Excel (ExcelJS, existing templates)
- Work order
- Parts order form (Liz import format)
- BOM/MRP export CSV
- Handover sheet

### Sprint 4 — Integrations
- Quote acceptance → auto job creation
- Quote acceptance → MRPeasy manufacturing order
- Quote acceptance → email job sheet to workshop
- Monday.com item creation (temporary)

### Sprint 5 — Compliance & Polish
- Link VIN plate generator from job record
- CVC compliance output (format TBC)
- Quote revision tracking
- Email quotes to customers via Resend
