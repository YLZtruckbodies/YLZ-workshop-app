# YLZ Quoting Platform — Task Board
*Engineering task tracking — updated as work progresses*

---

## SPRINT 0 — Discovery & Planning (CURRENT)

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| System codebase audit | System Architect | ✅ Done | See SYSTEM_AUDIT.md |
| Job Sheet Creator analysis | System Architect | ✅ Done | See JOB_SHEET_CREATOR_ANALYSIS.md |
| BOM reference review | Data Engineer | 🔄 In Progress | Excel not yet parsed |
| Questionnaire to user | Product Manager | ✅ Done | Awaiting answers |
| MRPEASY_INTEGRATION_PLAN.md | Integration Engineer | ✅ Done | |
| INNOVATION_OPPORTUNITIES.md | System Architect | ✅ Done | |
| TASK_BOARD.md | Product Manager | ✅ Done | |
| MISSING_IMAGE_REQUESTS.md | UX Designer | 📋 Queued | |

---

## SPRINT 1 — Foundation (After Questionnaire Answers)

### Backend
| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Review existing Prisma schema | Backend | 📋 Queued | Quote, PricingHistory, ProductTemplate already exist |
| Add MrpeasyProduct cache model | Backend | 📋 Queued | |
| Add MrpeasyBom cache model | Backend | 📋 Queued | |
| Add PartsOrder + PartsOrderItem models | Backend | 📋 Queued | |
| Run Prisma migration | Backend | 📋 Queued | |
| Seed Quick Quote templates (3 builds) | Backend | 📋 Queued | Needs prices from questionnaire |
| MRPeasy sync API (/api/mrpeasy/sync) | Integration | 📋 Queued | |
| MRPeasy status API (/api/mrpeasy/status) | Integration | 📋 Queued | |

### Frontend
| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Image directory structure | Frontend | 📋 Queued | /images/truck-bodies etc. |
| Placeholder image cards | UX | 📋 Queued | |
| Product selection page (/quotes/new) | Frontend | 📋 Queued | Image card grid |
| Quick Quote template cards | Frontend | 📋 Queued | 3 initial templates |

---

## SPRINT 2 — Configurator

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Port JSC sections 2–11 to React configurator | Frontend | 📋 Queued | |
| Add pricing step (section 12) | Frontend | 📋 Queued | |
| Auto-cascade logic (body length → chassis → wheelbase) | Backend | 📋 Queued | Already in JSC |
| Historical pricing lookup + display | Backend | 📋 Queued | API exists, UI needed |
| Manual price override with audit trail | Frontend | 📋 Queued | DB fields exist |
| Build record save (API integration) | Backend | 📋 Queued | |

---

## SPRINT 3 — Document Generation

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Quote PDF (jsPDF) | Frontend | 📋 Queued | YLZ letterhead |
| Auto job sheet Excel (ExcelJS) | Frontend | 📋 Queued | Extend existing JSC |
| Work order template | Frontend | 📋 Queued | |
| Parts order form | Frontend | 📋 Queued | |
| BOM / MRP export CSV | Backend | 📋 Queued | For Liz |
| Handover / delivery sheet | Frontend | 📋 Queued | |
| VIN plate data (link existing generator) | Frontend | 📋 Queued | |

---

## SPRINT 4 — Integrations

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| Monday.com item creation on quote accept | Integration | 📋 Queued | API exists |
| Quote → Job conversion flow | Backend | 📋 Queued | |
| MRPeasy manufacturing order creation | Integration | 📋 Queued | Needs API creds |
| Xero quote format export | Integration | 📋 Queued | PDF or API |

---

## SPRINT 5 — Compliance & Polish

| Task | Owner | Status | Notes |
|------|-------|--------|-------|
| ABS compliance output | Backend | 📋 Queued | |
| Engineer's cert PDF | Backend | 📋 Queued | |
| Weight cert PDF | Backend | 📋 Queued | |
| Image library management UI | Frontend | 📋 Queued | |
| Quote revision tracking | Backend | 📋 Queued | |
| Email quote to customer (Resend) | Backend | 📋 Queued | |

---

## Status Legend
- ✅ Done
- 🔄 In Progress
- 📋 Queued
- ⛔ Blocked
- ❌ Won't Do
