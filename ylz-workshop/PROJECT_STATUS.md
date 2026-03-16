# YLZ Workshop - Project Status

## Current State: Production Management System (LIVE)
The app is a working production management dashboard deployed on Vercel.
It tracks jobs from engineering through to dispatch with scheduling, timesheets, QA, and deliveries.

## What Works Today
- Full job lifecycle tracking (7 stages)
- Worker scheduling with auto-chaining
- Timesheet logging and CSV export
- QA checklists (37 items across 6 phases)
- Delivery/invoice tracking with payment status
- Monday.com job sync
- Google Sheets schedule sync
- Google Drive job file access
- Job Sheet Creator (PDF quote > Excel job sheets)
- VIN Plate Generator (batch PDF plates)
- Analytics dashboard with charts
- Coldform kit/chassis inventory
- Repairs/warranty tracking

## What's Missing for Quoting & Production Workflow

### HIGH PRIORITY - Core Quoting
- [ ] Visual product configurator (image cards)
- [ ] Quick quote templates for repeat builds
- [ ] Pricing engine with margin/overhead rules
- [ ] Quote document generation (PDF)
- [ ] Historical pricing memory
- [ ] MRPeasy cost data integration

### HIGH PRIORITY - Production Documents
- [ ] BOM generation from build config
- [ ] Parts order forms
- [ ] Work orders from quotes
- [ ] MRP export for Liz
- [ ] Handover/delivery sheets

### MEDIUM PRIORITY - Compliance & Integration
- [ ] ABS/compliance output generation
- [ ] MRPeasy API integration (cost sync)
- [ ] Sales module persistence (currently client-side only)

### LOWER PRIORITY - Enhancement
- [ ] Image library management
- [ ] Reports module
- [ ] Drawings management
- [ ] Email integration for quotes

## Database Extensions Needed
- Quote model (config, pricing, status, versions)
- QuoteLineItem (options with pricing)
- PricingRule (material costs, labour rates, margins)
- PricingHistory (historical price memory)
- BOM / BOMItem (bill of materials)
- BuildRecord (source of truth for all outputs)
- ProductTemplate (quick quote configs)
- ProductOption (configurator options)
- ImageAsset (product image library)

## Technical Approach
- Extend existing Next.js app (NOT rebuild)
- Add Prisma models via migration
- New pages under existing route groups
- Reuse auth, middleware, component patterns
- Standalone HTML tools for complex generators (proven pattern)
- MRPeasy integration via cached API sync
