# YLZ Quoting & Production Workflow - Implementation Plan

## FINALIZED from Questionnaire (March 2026)

## Key Business Rules
- **Shop rate:** $150/hr flat across all sections
- **Target margin:** 25% flat
- **Pricing source:** Experience-based (Pete's head) - system will build pricing memory
- **MRPeasy:** Enterprise plan, BOMs exist, no API credentials yet (cache-ready architecture)
- **Quote approvers:** Pete, Nathan
- **Quote creators:** Pete, Nathan, Sales team
- **Production sees pricing:** No
- **Manual overrides:** Allowed, flagged/logged
- **Historical pricing:** Yes - remember and show last quoted price
- **Xero:** Generate quotes that feed through Xero
- **Monday.com:** Still active, quoting creates Monday items
- **Job sheets:** Auto-create from quote, current Excel format kept
- **Parts ordering:** DOM orders, MRPeasy format
- **MRP export:** CSV for Liz
- **VIN:** Manual trigger when creating job
- **Compliance:** Engineer's cert + Weight cert, PDF format

## Top 3 Priorities (from Pete)
1. **Visual product selection with image cards**
2. **Auto job sheet from quote**
3. **Quote PDF generation**

## Architecture

### Standalone HTML Tool Pattern (proven)
The quoting system will be built as `public/quote-builder.html` - a standalone HTML tool like the job-sheet-creator and VIN plate generator. This pattern works well for:
- Complex client-side UI with no page reloads
- PDF generation (jsPDF)
- Excel generation (ExcelJS)
- Fast iteration without build steps

### Database-Backed via API
The HTML tool communicates with Next.js API routes for:
- Saving/loading quotes
- Historical pricing lookups
- Build record persistence
- Monday.com integration trigger

### Data Flow
```
PRODUCT SELECTION (image cards)
  → CONFIGURATOR (step-by-step options)
    → PRICING ENGINE (auto-calc + overrides)
      → BUILD RECORD (saved to DB)
        → QUOTE PDF (client-side jsPDF)
        → JOB SHEET (client-side ExcelJS)
        → MONDAY.COM ITEM (via API)
```

## Database Schema Extensions

### New Prisma Models
```prisma
model Quote {
  id            String   @id @default(cuid())
  quoteNumber   String   @unique  // QU-0001 format
  status        String   @default("draft")  // draft, sent, accepted, declined, expired
  customerId    String?
  customerName  String
  dealerName    String?
  contactName   String?
  contactEmail  String?
  contactPhone  String?
  buildType     String   // truck-body, trailer, truck-and-trailer

  // Build configuration (JSON blob)
  configuration Json     // Full config: brand, model, material, dimensions, options

  // Pricing
  subtotal      Float    @default(0)
  margin        Float    @default(25)
  overhead      Float    @default(0)
  discount      Float    @default(0)
  total         Float    @default(0)
  overridePrice Float?   // Manual override
  overrideBy    String?  // Who overrode
  overrideNote  String?  // Why

  // Metadata
  preparedBy    String
  salesPerson   String?
  validDays     Int      @default(30)
  notes         String?
  terms         String?

  // Relations
  jobId         String?  // Links to Job when converted

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  sentAt        DateTime?
  acceptedAt    DateTime?
  expiresAt     DateTime?
}

model PricingHistory {
  id            String   @id @default(cuid())
  configHash    String   // Hash of build config for matching
  buildType     String
  configuration Json     // Snapshot of config
  quotedPrice   Float
  quoteNumber   String
  customerName  String
  createdAt     DateTime @default(now())
}

model ProductTemplate {
  id            String   @id @default(cuid())
  name          String   // "UD Hardox 5.4m Tipper"
  category      String   // truck-body, trailer
  description   String?
  imagePath     String?  // Path to product image
  configuration Json     // Default config for quick quote
  basePrice     Float?   // Starting price
  sortOrder     Int      @default(0)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Implementation Phases

### Phase A: Foundation (DB + API)
1. Add Prisma models
2. Run migration
3. Create API routes: /api/quotes, /api/pricing, /api/templates
4. Seed ProductTemplate with common builds

### Phase B: Quote Builder HTML Tool
1. Product selection page with image cards
2. Configurator: truck brand → body type → dimensions → material → options
3. Pricing calculator with line items
4. Quote summary with override capability
5. Quote PDF generation (jsPDF)
6. Auto job sheet generation (ExcelJS)
7. Save/load via API

### Phase C: Integration
1. Next.js page wrapper at /quotes
2. Quote list page with status tracking
3. Monday.com item creation on quote accept
4. Navigation updates (sidebar)

### Phase D: Polish
1. Placeholder product images
2. Standard T&Cs text
3. Historical pricing display
4. Quote PDF styling
5. Deploy to Vercel

## Quote PDF Structure
- YLZ letterhead/logo
- Quote number, date, validity
- Customer details
- Build specification table
- Line items with pricing
- Inclusions list
- Terms & Conditions
- Delivery timeframe
- Prepared by / Sales person
- Total with GST

## Configurator Steps
1. **Build Type** - Truck Body / Trailer / Both (image cards)
2. **Truck Brand** (if truck) - Image cards for each brand
3. **Trailer Type** (if trailer) - Dog/Semi/Dolly/Pig cards
4. **Material** - Hardox / Aluminium / Steel cards
5. **Dimensions** - Body length, width, height dropdowns
6. **Body Options** - Tailgate, headboard, sheets, accessories
7. **Chassis/Subframe** - Suspension, brakes, axles, hoist
8. **Tarp** - Type, material, colour, bows
9. **Running Gear** - Wheels, tyres, mudflaps
10. **Paint** - Colour selection
11. **Extras** - Toolboxes, lighting, cameras, etc.
12. **Review & Price** - Summary with pricing, overrides
13. **Generate** - Quote PDF + Job Sheet Excel
