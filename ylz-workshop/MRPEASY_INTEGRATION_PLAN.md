# MRPeasy Integration Plan

## Current State
- YLZ has MRPeasy Enterprise plan
- BOMs exist in MRPeasy (confirmed)
- API credentials: NOT YET SET UP in app
- Reference data available: `bom reference for mrpeasy/assembly part numbers 13032026.xlsx`
- No API calls exist in codebase yet

---

## Architecture Design

### Core Principle: Cache-First, Never Block Quoting
The quoting system must NEVER depend on a live MRPeasy API call to function.
All pricing decisions use cached local data. Manual override always available.

```
MRPeasy API
  ↓ (manual sync or scheduled)
Local Cache Tables (PostgreSQL)
  ↓ (instant reads)
Pricing Engine
  ↓
Quote / BOM
```

---

## API Connection Design

### Authentication
MRPeasy uses API key + company ID authentication.
Store credentials in environment variables:
```
MRPEASY_API_KEY=xxx
MRPEASY_COMPANY_ID=xxx
MRPEASY_BASE_URL=https://app.mrpeasy.com/api/v1
```

### Key MRPeasy API Endpoints to Use
| Endpoint | Purpose |
|----------|---------|
| `/products` | Get all products/components with costs |
| `/bom` | Get bill of materials for each assembly |
| `/purchase-orders` | Create purchase orders (parts ordering) |
| `/manufacturing-orders` | Create MO when job is approved |
| `/workcentres` | Get work centres for labour routing |

---

## Database Cache Tables Needed

### MrpeasyProduct (cache)
```prisma
model MrpeasyProduct {
  id            String   @id // MRPeasy internal ID
  sku           String   @unique
  name          String
  description   String?
  category      String?  // assembly, component, raw material
  unitCost      Float    // latest cost from MRPeasy
  unit          String?  // each, kg, m, etc.
  lastSyncAt    DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### MrpeasyBom (cache)
```prisma
model MrpeasyBom {
  id            String   @id @default(cuid())
  assemblyId    String   // FK to MrpeasyProduct
  assemblyName  String
  componentId   String   // FK to MrpeasyProduct
  componentName String
  quantity      Float
  unit          String?
  lastSyncAt    DateTime
  createdAt     DateTime @default(now())
}
```

### MrpeasySyncLog
```prisma
model MrpeasySyncLog {
  id         String   @id @default(cuid())
  type       String   // products, bom, full
  status     String   // success, failed, partial
  itemCount  Int
  errorMsg   String?
  syncedAt   DateTime @default(now())
}
```

---

## Pricing Sync

### What Gets Synced
1. Product/component unit costs
2. BOM structures (assembly → components → quantities)
3. Calculated assembly costs (sum of component costs × qty)

### Sync Triggers
- Manual: "Sync MRPeasy Prices" button in admin settings
- Scheduled: Weekly automatic sync (cron job or Vercel cron)
- On-demand: When opening quote builder (checks if cache is > 7 days old)

### Cache Staleness Policy
- Cache age displayed in admin panel
- Warn if cache > 7 days old
- Always allow quoting from cached data
- Flag quote with "PRICING FROM CACHE [date]" if cache > 30 days old

---

## BOM Mapping

### How Build Configs Map to MRPeasy BOMs

Each quick quote template maps to one or more MRPeasy assembly numbers:

| Build Type | MRPeasy Assembly (to be confirmed) |
|-----------|-----------------------------------|
| 10m3 Hardox Tipper Body | TBD from Excel reference |
| Alloy Dog Trailer | TBD from Excel reference |
| Alloy Truck + Dog Combo | TBD from Excel reference |

BOM mapping file: `bom reference for mrpeasy/assembly part numbers 13032026.xlsx`
*Note: Needs reading to extract actual assembly numbers*

### BOM Export for Liz (CSV)
Format (matching what Liz uses in MRPeasy):
```csv
Job Number, Assembly Name, Part Number, Description, Qty, Unit, Cost
YLZ1085, 10m3 Hardox Tipper, PART-001, Hardox 450 4mm Sheet, 2.5, sheet, 850.00
```

API endpoint: `POST /api/bom/export?jobId=xxx&format=csv`

---

## Parts Ordering (DOM Orders)

### DOM Order Flow
```
Quote accepted
  → BOM resolved from config
    → Parts not in stock flagged
      → Auto-generate DOM order form
        → User reviews + sends
          → Order tracked in system
            → Parts received status updated
```

### DOM Order Table Needed
```prisma
model PartsOrder {
  id          String   @id @default(cuid())
  jobId       String
  quoteId     String?
  status      String   // draft, sent, partial, complete
  supplier    String?
  orderDate   String?
  expectedDate String?
  notes       String?
  items       PartsOrderItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PartsOrderItem {
  id          String   @id @default(cuid())
  orderId     String
  partNumber  String
  description String
  quantity    Float
  unit        String?
  unitCost    Float?
  totalCost   Float?
  status      String   // ordered, received, backordered
  order       PartsOrder @relation(...)
}
```

---

## Pricing Source Tracking

Every quote must record where its pricing came from:

```json
{
  "pricingSource": "mrpeasy-cache | historical | manual-override | estimate",
  "pricingCacheDate": "2026-03-13",
  "mrpeasyAssemblyId": "ASM-001",
  "historicalQuoteRef": "QU-0042",
  "overrideBy": "Pete S",
  "overrideNote": "Special deal for repeat customer"
}
```

---

## Manual Sync API

```
POST /api/mrpeasy/sync
  Body: { type: "products" | "bom" | "full" }
  Auth: fullAdmin only
  Response: { synced: 145, errors: 0, timestamp: "..." }

GET /api/mrpeasy/status
  Response: { lastSync: "...", productCount: 145, bomCount: 320, cacheAge: "2 days" }

GET /api/mrpeasy/products?search=xxx
  Response: [{ id, sku, name, unitCost, ... }]

GET /api/mrpeasy/bom?assemblyId=xxx
  Response: { assembly: {...}, items: [{component, qty, cost}] }
```

---

## Fallback Behaviour

If MRPeasy API is unavailable:
1. Use local cache (always primary source)
2. If no cache exists, use manual price entry
3. Display warning: "MRPeasy sync failed — prices from cache [date]"
4. Never block quote creation

---

## Questions Still Needed (from User)

- [ ] MRPeasy API key — who can provide this?
- [ ] Are BOMs in MRPeasy structured by job type (tipper, trailer, etc.)?
- [ ] Does MRPeasy have labour routing (work centres) configured?
- [ ] Are material costs (Hardox, alloy, etc.) in MRPeasy as separate line items?
- [ ] Is the BOM in `assembly part numbers 13032026.xlsx` the complete BOM or a subset?
- [ ] Does Liz create MRPeasy manufacturing orders manually, or should the system create them?
- [ ] What CSV format does Liz import into MRPeasy?
- [ ] Should purchase orders be created in MRPeasy automatically when a job is approved?
