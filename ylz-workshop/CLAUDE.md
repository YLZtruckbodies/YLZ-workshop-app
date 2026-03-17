# YLZ Workshop App — Claude Context

## Business
- **Legal name:** YLZ Truck Bodies Pty Ltd
- **Trading as:** YLZ Truck Bodies & Trailers
- **Owner / Production Manager:** Nathan Whiles
- **Sales Manager:** Pete Sim (Peter Sim)
- **Address:** 29 Southeast Boulevard, Pakenham VIC 3810, Australia
- **Phone:** 03 5940 7620
- **ABN:** 39 615 324 546
- **Website:** ylztruckbodies.com.au
- **Tagline:** *"Quality Craftsmanship Tailored for Real World Work"*

YLZ designs and manufactures premium custom truck bodies and trailers — tippers, trays, service bodies, subframes, and specialised builds — for construction, mining, logistics, and civil works industries across Victoria and beyond.

## This App
A full-stack production management and quoting app built with:
- **Next.js 14** (App Router) + TypeScript
- **Prisma** ORM + **Neon** (PostgreSQL) database
- **NextAuth.js** — PIN-based login, no email/OAuth
- **Vercel** hosting → https://ylz-workshop.vercel.app

## Brand
- Background: `#000000`
- Surface: `#111111` / `#1a1a1a`
- Accent / Orange: `#E8681A` — buttons, highlights, active states
- Text: `#ffffff` primary, `rgba(255,255,255,0.6)` secondary
- Font: League Spartan (headings/labels), system sans-serif (body)

## Key Users & PINs
| User   | Role                | PIN  | Permissions |
|--------|---------------------|------|-------------|
| Nathan | Production Manager  | 1234 | Full admin  |
| Keith  | Workshop Scheduler  | 2345 | Schedule + boards |
| Pete   | Sales Manager       | 3456 | Quotes, prod board |
| Chris  | Engineer            | —    | Engineering / job sheets |
| Matt   | QC Supervisor       | 4444 | Sections, timesheets |
| Ben    | Alloy Supervisor    | 5555 | Sections, timesheets |
| Liz    | MRPeasy / Admin     | 7777 | Prod board, timesheets |
| Wendy  | Accounts / Xero     | 8888 | Prod board, timesheets |

## Quote & Job Sheet Constants
- Coupling options: V.Orlandi (2.5T), Bartlett Ball 127mm (2.5T), Pintle Hook PH300 with Air Cushion (8.1T)
- Hoist options: Binotto 3190, Hyva Alpha 092, Hyva Alpha 190, PH122 Kröger
- Tarp options: Razor PVC/MESH Electric, Razor PVC/MESH Manual, EziTarp Electric, Pulltarp Manual
- Standard terms: Purchase Order Requirement / Quote Validity / Pricing / Lead Times / Cancellations & Amendments
- Quote validity default: 30 days
- GST: 10%

## Trailer Chassis Length Lookup (body length → chassis length)
- 5300, 5350, 5400mm body → 4930mm chassis
- 6000, 6100mm body → 5450mm chassis
- 7700mm body → 7470mm chassis
- 8300mm body → 7870mm chassis
- 9200, 9600mm body → 8950mm chassis (9600 TBC)
- 10200mm body → 9450mm chassis

## External Systems
| System     | Purpose |
|------------|---------|
| MRPeasy    | Inventory, works orders, MRP |
| Xero       | Accounts, payroll |
| Monday.com | Job tracking (board ID: 1905554165) |
| Google Drive | Drawings, job sheets, documents |
| Neon (PostgreSQL) + Vercel | This app |

## How Nathan Works
- Hands-on, practical — no fluff
- Australian English throughout
- Use Australian date format dd/mm/yyyy
- Prefer concise answers; bullet points for lists
- App is used on tablets in a dusty workshop — touch targets min 44px, text min 13px
- Dark theme is non-negotiable
