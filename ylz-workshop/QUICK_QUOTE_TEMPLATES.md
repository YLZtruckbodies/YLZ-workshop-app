# Quick Quote Templates — Confirmed Specs
*All prices confirmed by Pete S, March 2026*

---

## Template 1 — 10m3 Hardox Tipper Body

| Field | Value |
|-------|-------|
| **Sell Price** | $45,000 ex GST |
| **Material** | Hardox 500 |
| **Floor** | 6mm Hardox 500 |
| **Sides** | 5mm Hardox 500 |
| **Front** | 5mm Hardox 500 |
| **Tailgate** | 5mm Hardox 500 |
| **Hoist** | Binotto 3190 (supplied by TES) |
| **Tarp** | Razor PVC/MESH electric tarp system |
| **Coupling** | V.Orlandi (Italian branded tow coupling) |
| **Controls** | Electric hand controller |
| **Hydraulics** | Split & supply hydraulic tank |
| **Lead time** | 5 weeks |
| **Payment terms** | 30% deposit OR dealer PO |

### Standard Inclusions (what's in the $45,000)
- Razor PVC/MESH electric tarp system
- V.Orlandi tow coupling
- Electric hand controller
- Split & supply hydraulic tank
- Binotto 3190 hoist
- Body fabricated in Hardox 500 to standard dimensions for truck

### What Changes the Price
- Different hoist model (upgrade/downgrade from Binotto 3190)
- Bi-fold tailgate (vs standard single piece drop-down)
- Manual tarp instead of electric
- Quarry spec width (2400mm instead of standard 2250/2290mm)
- Changing material (e.g. to Bisalloy)
- Any major spec change outside the above standard inclusions

### What Does NOT Change the Price
- Minor dimensional adjustments to suit specific truck chassis
- Standard truck brand fitment differences
- Body length variation within normal fitment range

### Notes for Quote Document
- "Dimensions may vary ±25mm to suit specific truck chassis at no extra cost"
- "Price based on standard fitment — major option changes quoted separately"

---

## Template 2 — Alloy Truck + Dog Combo 19m3

| Field | Value |
|-------|-------|
| **Truck Body Price** | $55,000 ex GST |
| **Dog Trailer Price** | $125,000 ex GST |
| **Combined Price** | $180,000 ex GST |
| **Material** | Aluminium |
| **Tarp** | Razor PVC/MESH electric tarp system (truck + trailer) |
| **Axles** | 4-axle dog trailer |
| **Axle Make** | SAF |
| **Axle Brake** | Drum or Disc (customer choice — not a price change) |
| **Suspension** | SAF Air Ride |
| **PBS Rating** | 56.5T gross combination mass |
| **Lead time** | 5 weeks |
| **Payment terms** | 30% deposit OR dealer PO |

### Standard Inclusions — Truck Body
- Alloy tipper body to 19m3 capacity
- Razor PVC/MESH electric tarp system
- Electric hand controller

### Standard Inclusions — Dog Trailer
- Alloy tipper body to 19m3 capacity
- 4-axle SAF air ride suspension
- Drum or disc brake (customer nomination)
- Razor PVC/MESH electric tarp system
- PBS compliant to 56.5T GCM

---

## Template 3 — Alloy Truck + Dog Combo 20m3

| Field | Value |
|-------|-------|
| **Truck Body Price** | $55,000 ex GST |
| **Dog Trailer Price** | $126,750 ex GST |
| **Combined Price** | $181,750 ex GST |
| **Material** | Aluminium |
| **Tarp** | Razor PVC/MESH electric tarp system (truck + trailer) |
| **Axles** | 4-axle dog trailer |
| **Axle Make** | SAF |
| **Axle Brake** | Drum or Disc (customer choice — not a price change) |
| **Suspension** | SAF Air Ride |
| **PBS Rating** | 57.5T gross combination mass |
| **Lead time** | 5 weeks |
| **Payment terms** | 30% deposit OR dealer PO |

### Standard Inclusions — Truck Body
- Alloy tipper body to 20m3 capacity
- Razor PVC/MESH electric tarp system
- Electric hand controller

### Standard Inclusions — Dog Trailer
- Alloy tipper body to 20m3 capacity
- 4-axle SAF air ride suspension
- Drum or disc brake (customer nomination)
- Razor PVC/MESH electric tarp system
- PBS compliant to 57.5T GCM

---

## Global Pricing Rules

| Rule | Value |
|------|-------|
| Shop rate | $150/hr |
| Target margin | 25% |
| Lead time (all builds) | 5 weeks |
| Payment terms | 30% deposit OR Purchase Order from dealer |
| Price validity | 30 days (configurable per quote) |
| GST | Add 10% to all ex-GST prices above |

---

## Corrections to Existing System

The following discrepancies were found between the existing Job Sheet Creator and confirmed specs:

| Item | JSC Had | Correct Value |
|------|---------|---------------|
| Hardox grade | Hardox 450 | **Hardox 500** |
| Hoist options | Hyva Alpha, Palfinger | **Binotto 3190** (primary); keep others for legacy |
| Tarp type | EziTarp, Pulltarp | **Razor PVC/MESH** (primary); keep others for legacy |
| Axle primary | BPW, Fuwa | **SAF** (primary); keep others for legacy |

These need to be corrected in:
- `public/job-sheet-creator.html` (dropdown options)
- `public/quote-builder.html` (dropdown options)
- ProductTemplate seed data
- Any hardcoded option lists in `app/api/` routes
