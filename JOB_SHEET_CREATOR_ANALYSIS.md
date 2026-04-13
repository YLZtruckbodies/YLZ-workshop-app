# Job Sheet Creator — Deep Analysis
*Extracted from `public/job-sheet-creator.html` and `brief/` materials*

---

## 1. What It Is

The Job Sheet Creator is a standalone HTML tool (no build step, client-side only) that:
1. Accepts a Xero quote PDF via drag-and-drop
2. Auto-parses ~30 fields from the PDF text using regex patterns
3. Allows an engineer to fill in additional engineering-specific fields
4. Generates an Excel job sheet using one of two templates:
   - `Job Sheet Template Truck - REV.03.02.2026.xlsx`
   - `Job Sheet Template Trailer - REV.23-10-2025.xlsx`

It is the current "bridge" between Xero quoting and the workshop floor.

---

## 2. Section Structure (12 Cards)

| Card | Name | Type | Source |
|------|------|------|--------|
| 1 | Import Quote | PDF upload + parse | Auto |
| 2 | Job Type & Order Details | Identity/admin | Auto + Eng |
| 3 | Body Dimensions | Core specs | Auto + Eng |
| 4 | Controls | Hydraulic/electric control routing | Eng |
| 5 | Subframe / Chassis | Structural specs | Eng |
| 6 | Sheets & Accessories | Material specs + options | Auto + Eng |
| 7 | Tarp | Tarp system selection | Auto |
| 8 | Running Gear | Axles, suspension, tyres, brakes | Auto |
| 9 | Chassis Accessories & Couplings | Trailer couplings + checklist | Auto + Eng |
| 10 | Paint, Lights & Mudflaps | Finish specifications | Auto |
| 11 | Notes | Free-text + raw PDF lines | Auto |
| 12 | Generate | Output trigger | — |

---

## 3. Complete Field Inventory

### Card 2 — Job Type & Order Details

| Field ID | Label | Source | Notes |
|----------|-------|--------|-------|
| f_customer | Customer | Auto | Parsed from "Invoice to" or "Attention" in PDF |
| f_dealer | Dealer | Auto | Parsed from first company name after "QUOTE" in PDF |
| f_quote_number | Quote Number | Auto | Parsed (QU-XXXX format) |
| f_job_number | Job Number | Eng | Manual entry e.g. YLZ1085 |
| f_issue_date | Issue Date | Auto | Today's date default |
| f_prepared_by | Prepared By | Eng | Dropdown: JW, JH, NW, CT |
| f_sales_person | Sales Person | — | Dropdown: NW, PS |
| f_revision | Revision | — | Default "A" |
| f_trailer_model | Trailer Model | Auto | DT-3 to PIG-3 |
| f_trailer_type | Trailer Type | — | P Beam, I Beam, I Beam Drop Deck, Converter Dolly |
| f_trailer_serial | Trailer Serial | Eng | — |
| f_trailer_vin | Trailer VIN | Eng | max 17 chars |
| f_truck_make | Truck Make | Auto | 13 makes listed |
| f_truck_model | Truck Model | Auto | Free text from PDF |
| f_truck_vin | Truck VIN | Eng | max 17 chars |
| f_sales_drawing | Sales Drawing | — | — |

**Build Types:** `truck` | `trailer` | `both`

**Prepared By initials:**
- JW = Josh W
- JH = Josh H
- NW = Nathan W
- CT = (unknown — need confirmation)

### Card 3 — Body Dimensions

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_material | Material | Auto | Aluminium, Hardox, N/A |
| f_body_length | Body Length | Auto | Truck: 3900–6000mm (23 sizes); Trailer: 6000–10400mm (10 sizes) |
| f_body_width | Body Width | Auto | 2250mm Steel, 2290mm Alloy, 2400mm Quarry spec, N/A |
| f_body_height | Body Height | Auto | Truck: 1000–1500mm (7); Trailer: 1100–1520mm (7) |
| f_mainrunner_width | Mainrunner Width | Eng | Truck: 762–865mm (5); Trailer: 965/1000/818 Pig mm |
| f_hoist_box_height | Hoist Box Height | Eng | 1520mm 3AD, 1630mm 4AD, 1630mm 5AD, 1730mm 10.4m Semi, 1260mm bottom measurement |
| f_hinged | Hinged | Eng | 430mm Forward, 250mm Forward & Side, Rear Hinged |
| f_cl_pivot | C/L Pivot to Rear | Eng | 510mm 3AD, 190mm 7700 Dog, 330mm 8300 Dog, 250mm 9200 Semi, 395mm |

**Truck body lengths (23):** 3900, 4000, 4100, 4200, 4300, 4400, 4500, 4600, 4660, 4700, 4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000mm

**Trailer body lengths (10):** 6000, 6050, 6100, 6400, 7700, 8300, 9200, 9400, 9600, 10400mm

### Card 4 — Controls

All control fields use same options: Existing Electric in Dash | Existing PTO Switch with Hand Held Controller | 12V Hand Controller | 24V Hand Controller | OEM Switches in Cab | N/A

| Field ID | Label |
|----------|-------|
| f_pto | PTO |
| f_ctrl_truck_hoist | Truck Hoist |
| f_ctrl_trailer_hoist | Trailer Hoist |
| f_ctrl_truck_tailgate | Truck Tailgate |
| f_ctrl_trailer_tailgate | Trailer Tailgate |
| f_ctrl_lockflap | Trailer Lockflap |
| f_ctrl_truck_tarp | Truck Tarp |
| f_ctrl_trailer_tarp | Trailer Tarp |

### Card 5 — Subframe / Chassis

**Truck Subframe:**

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_subframe_length | Subframe Length | Eng | Free text |
| f_subframe_width | Subframe Width | Eng | Free text |
| f_hoist_model | Hoist Model | Eng | Hyva Alpha 191-4, 201-4, 241-4; Palfinger PH T74 |
| f_valve_bank | Valve Bank | Eng | 1 Spool (Body Only), 2 Spool (Body + Tailgate), 3 Spool (Body + Tailgate + Tarp) |
| f_oil_tank_type | Oil Tank Type | Auto | Behind Cab / Under Tray × Steel/Alloy × 80L/120L |
| f_oil_tank_location | Oil Tank Location | Auto | Behind Cab LHS/RHS; Under Tray LHS/RHS Front/Rear/Centre |
| f_pto_type | PTO Type | Auto | Chelsea/Parker, Muncie, Customer Supplied |
| f_pump_type | Pump Type | Eng | Permco, Parker, Casappa, Customer Supplied |

**Trailer Chassis:**

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_chassis_length | Chassis Length | Auto | 4930–10000mm (8 options) |
| f_wheelbase | Wheelbase | Auto | Auto-cascaded from chassis length |
| f_drawbar_length | Drawbar Length | Eng | 3000–5000mm (6 options) |
| f_t_hoist_model | Hoist Model | Eng | Same as truck |

**Auto-cascade logic:**
```
Body Length → Chassis Length (CHASSIS_LENGTH_MAP):
  5400 → 4930mm Dog
  6000–6400 → 5450mm Dog
  7700 → 7470mm Dog
  8300 → 7870mm Dog
  9200 → 9100mm Semi
  9400 → 9120mm Dog
  9600 → 9405mm Dog
  10400 → 10000mm Semi

Chassis Length → Wheelbase (WHEELBASE_MAP):
  4930 Dog → 3240mm
  5450 Dog → 3760mm
  7470 Dog → 5700mm
  7870 Dog → 6150mm
  9100 Semi → 6610mm
  9120 Dog → 6685/6235mm
  9405 Dog → 7615/7165mm
  10000 Semi → 7615/7165mm
```

### Card 6 — Sheets & Accessories

**Sheet Specs (4 fields, same options):**

| Field ID | Label | Source |
|----------|-------|--------|
| f_floor_sheets | Floor Sheets | Auto |
| f_side_sheets | Side Sheets | Auto |
| f_front_sheet | Front Sheet | Auto |
| f_tailgate_sheet | Tailgate Sheet | Auto |

Options per sheet: 3mm/4mm/5mm/6mm × Hardox 450 / Bisalloy 400 / Aluminium

**Body Accessories (15 checkboxes):**
`f_rope_rails`, `f_toolbox_lhs`, `f_toolbox_rhs`, `f_water_cooler`, `f_ladder`, `f_tow_hitch`, `f_headboard`, `f_cab_guard`, `f_load_pegs`, `f_underbody_toolbox`, `f_grain_sides`, `f_mesh_extensions`, `f_drop_sides`, `f_side_pegs`, `f_rear_bumper`

**Tailgate:**
- `f_tailgate_type`: Barn Doors, Single Piece Drop Down, Single Piece Swing Up, Bi-Fold
- `f_tailgate_lights`: LED Recessed, LED Surface Mount, Incandescent, Customer Supplied

### Card 7 — Tarp

| Field ID | Label | Source |
|----------|-------|--------|
| f_tarp_type | Tarp Type | Auto |
| f_tarp_make | Tarp Make/Model | Auto |
| f_t_tarp_type | Trailer Tarp Type | Auto |
| f_t_tarp_make | Trailer Tarp Make/Model | Auto |

Tarp types: Manual Pull Over, EziTarp Electric, Pulltarp Electric, Aero Easy Cover, Rollover Mesh, Rollover PVC, Side Tipper Tarp

**Parser mappings:**
- "razor electric" or "ezitarp" → EziTarp Electric
- "pulltarp" → Pulltarp Electric
- "aero easy" → Aero Easy Cover

### Card 8 — Running Gear

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_axle_make | Axle Make | Auto | BPW, Fuwa, SAF |
| f_axle_type | Axle Type | Auto | Drum Brake, Disc Brake |
| f_axle_rating | Axle Rating | Auto | 9T, 10T, 12T |
| f_num_axles | No. of Axles | Auto | 2, 3, 4, 5 |
| f_suspension | Suspension | Auto | BPW/Fuwa/SAF Air Ride, Mechanical Spring |
| f_tyres | Tyres | Auto | 295/80R22.5, 11R22.5, 385/65R22.5, Super Single |
| f_wheels | Wheels | Auto | Steel/Alloy 10 Stud, Steel/Alloy 8 Stud, Super Single Alloy |
| f_brakes | Brakes | Auto | EBS (Full Electronic), ABS, Standard Relay Valve |
| f_spare_carrier | Spare Wheel Carrier | Auto | Under Chassis Winch/Slider, Rear/Side Mounted |
| f_landing_legs | Landing Legs | — | Holland, Jost, BPW |

### Card 9 — Chassis Accessories & Couplings

**Couplings:**

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_coupling_type | Coupling Type | Auto | Ring Feeder, Auto, Jost/Holland/Ringfeder Turntable |
| f_coupling_height | Coupling Height | Eng | Free text mm |
| f_kingpin | Kingpin | Auto | 2"/3.5" Jost/Holland |
| f_pintle_hook | Pintle Hook | Auto | Ringfeder, Holland |
| f_d_value | Towbar D Value (kN) | — | Free text |
| f_towbar_vertical | Towbar Plate Vertical Load | — | Light/Medium/Heavy Duty |
| f_towbar_type | Towbar Type | — | Bolted, Welded, Customer Supplied |
| f_pintle_eye_height | Pintle Eye Height | — | Free text mm |

**Chassis Accessories (12 checkboxes):**
`f_mudguards`, `f_spray_suppression`, `f_side_markers`, `f_reflectors`, `f_air_reservoir`, `f_water_tank`, `f_fuel_tank`, `f_air_dryer`, `f_belly_plates`, `f_chassis_toolbox`, `f_jockey_wheel`, `f_safety_chains`

### Card 10 — Paint, Lights & Mudflaps

| Field ID | Label | Source | Options |
|----------|-------|--------|---------|
| f_body_paint | Body Paint Colour | Auto | Free text |
| f_chassis_paint | Chassis Paint Colour | Auto | Free text |
| f_drawbar_paint | Drawbar Paint Colour | — | Free text |
| f_paint_code | Paint Code | — | Free text |
| f_rear_lights | Rear Lights | Auto | LED Combo Tail Lights, LED Separate Functions, Narva/Hella LED, Incandescent |
| f_side_marker_lights | Side Marker Lights | Auto | LED Amber, LED Red/Amber, Incandescent |
| f_work_lights | Work Lights | — | 2x/4x LED, Customer Supplied |
| f_beacon | Beacon | Auto | LED Amber Rotating/Strobe, LED Mini Light Bar |
| f_mudflap_type | Mudflap Type | Auto | Rubber Black/Logo, Poly Plastic, Anti-Spray |
| f_mudflap_brackets | Mudflap Brackets | — | Standard/Spring Loaded/Stainless Steel |

---

## 4. PDF Parsing Logic

The parser uses regex patterns on Xero PDF text to extract:

**Job type detection:**
- Regex for axle+dog/semi/pig → "trailer"
- Regex for "tipper body build" or "body suit" → "truck"
- Both present → "both" (splits text at trailer section start)

**Truck detection patterns:**
- Make: word-boundary match for 13 known makes
- Model: text after make, cleaned of material/type words
- Dimensions: "Nmm long/wide/high" or "length/width/height: N"

**Trailer detection patterns:**
- Model: "\d axle [words] dog/semi/pig trailer" → DT-N/ST-N/PIG-N format
- Dimension patterns same as truck
- Axle: BPW/Fuwa/SAF keywords
- Brake: drum/disc patterns (disc "upgrade" excluded from disc result)

**Sheet spec patterns:**
- "Nmm material floor/side/front/tailgate"
- "floor: Nmm material"

**Paint:** "suit [cab] - *Colour Name" or "colour: Colour" or "painted Colour"

---

## 5. Internal Terminology

| Term | Meaning |
|------|---------|
| Auto | Field auto-populated from PDF |
| Eng | Engineering field — requires manual input |
| 3AD | 3-Axle Dog trailer |
| 4AD | 4-Axle Dog trailer |
| 5AD | 5-Axle Dog trailer |
| Quarry spec | 2400mm wide body (wider than standard) |
| C/L Pivot | Centreline pivot measurement (hinge geometry) |
| Hoist Box Height | Body height measured at hoist location |
| Mainrunner Width | Internal width of main structural runners |
| EBS | Electronic Braking System (full electronic) |
| ABS | Anti-lock Braking System |
| PTO | Power Take-Off (drives hydraulic pump) |
| Valve Bank | Hydraulic valve block (controls spool functions) |
| Lockflap | Rear door locking mechanism |
| Pintle Hook | Rear coupling for towing another trailer |
| D-Value | Drawbar coupling rating in kilonewtons |

---

## 6. Implied System Fields for New Quoting Platform

From the Job Sheet Creator, the new Build Record / Quote configuration JSON should capture at minimum:

```json
{
  "job_type": "truck | trailer | both",
  "customer": "",
  "dealer": "",
  "quote_number": "",
  "job_number": "",
  "issue_date": "",
  "prepared_by": "",
  "sales_person": "",
  "revision": "A",

  "truck": {
    "make": "",
    "model": "",
    "vin": "",
    "sales_drawing": "",
    "material": "",
    "body_length": "",
    "body_width": "",
    "body_height": "",
    "mainrunner_width": "",
    "hoist_box_height": "",
    "hinged": "",
    "cl_pivot": "",
    "subframe_length": "",
    "subframe_width": "",
    "hoist_model": "",
    "valve_bank": "",
    "oil_tank_type": "",
    "oil_tank_location": "",
    "pto_type": "",
    "pump_type": "",
    "floor_sheets": "",
    "side_sheets": "",
    "front_sheet": "",
    "tailgate_sheet": "",
    "tailgate_type": "",
    "tailgate_lights": "",
    "tarp_type": "",
    "tarp_make": "",
    "body_paint": "",
    "accessories": []
  },

  "trailer": {
    "model": "",
    "trailer_type": "",
    "serial": "",
    "vin": "",
    "material": "",
    "body_length": "",
    "body_width": "",
    "body_height": "",
    "mainrunner_width": "",
    "hoist_box_height": "",
    "hinged": "",
    "cl_pivot": "",
    "chassis_length": "",
    "wheelbase": "",
    "drawbar_length": "",
    "hoist_model": "",
    "floor_sheets": "",
    "side_sheets": "",
    "front_sheet": "",
    "tailgate_sheet": "",
    "tailgate_type": "",
    "tailgate_lights": "",
    "axle_make": "",
    "axle_type": "",
    "axle_rating": "",
    "num_axles": "",
    "suspension": "",
    "tyres": "",
    "wheels": "",
    "brakes": "",
    "spare_carrier": "",
    "landing_legs": "",
    "coupling_type": "",
    "coupling_height": "",
    "kingpin": "",
    "pintle_hook": "",
    "d_value": "",
    "tarp_type": "",
    "tarp_make": "",
    "chassis_paint": "",
    "drawbar_paint": "",
    "accessories": []
  },

  "controls": {
    "pto": "",
    "truck_hoist": "",
    "trailer_hoist": "",
    "truck_tailgate": "",
    "trailer_tailgate": "",
    "lockflap": "",
    "truck_tarp": "",
    "trailer_tarp": ""
  },

  "paint": {
    "body": "",
    "chassis": "",
    "drawbar": "",
    "code": ""
  },

  "lights": {
    "rear": "",
    "side_markers": "",
    "work": "",
    "beacon": ""
  },

  "mudflaps": {
    "type": "",
    "brackets": ""
  }
}
```

---

## 7. Implied Workflows

### Current Workflow (what JSC implements)
```
Xero Quote PDF (external)
  → Drop PDF into JSC
    → Auto-parse ~30 fields
      → Engineer fills remaining ~20 fields
        → Generate Excel job sheet
```

### Target Workflow (new system)
```
Click product image card
  → Fill guided configurator (same 12 sections as JSC)
    → System generates price (rules + history)
      → Manual override if needed
        → Save Build Record
          → Generate: Quote PDF + Job Sheet Excel + Work Order + Parts Form + BOM + Monday item
```

The new configurator should use the **same section structure** as the JSC (Cards 2–11) but:
- Drive it from the **quoting side** (not from PDF import)
- Pre-fill defaults from Quick Quote templates
- Add pricing fields at the end

---

## 8. Document Logic

### Excel Template Logic
- Two template files: Truck variant and Trailer variant
- Template has pre-formatted cells, YLZ letterhead
- Fields mapped to specific Excel cells
- "Auto" fields from PDF become pre-filled input data
- "Eng" fields are filled in the tool before generation

### Output Format
- `.xlsx` file downloaded client-side
- One worksheet per job (truck body or trailer)
- "Both" jobs generate 2 sheets

---

## 9. Option Groups That Should Map to Configurator

For the new visual configurator, option groups should match JSC sections:

1. **Product Type** → Build type (truck/trailer/both)
2. **Vehicle** → Truck brand, trailer model
3. **Body** → Material, dimensions (length/width/height)
4. **Structure** → Mainrunner, hoist box, pivot geometry
5. **Hydraulics** → Hoist model, valve bank, oil tank, PTO, pump
6. **Sheets** → Floor/side/front/tailgate gauge and material
7. **Accessories** → 15 body + 12 chassis checkboxes
8. **Tarp** → Type, brand
9. **Running Gear** → Axles, suspension, tyres, brakes
10. **Couplings** → Coupling type, kingpin, pintle, D-value
11. **Paint & Lights** → Colours, lights, beacon, mudflaps
12. **Controls** → PTO/hoist/tailgate/tarp control routing

---

## 10. What Still Needs Clarification from User

The following could not be resolved from the Job Sheet Creator alone:

### Pricing Logic
- [ ] What is the base price for the 10m3 Hardox tipper (with V.Orlandi and electric tarp)?
- [ ] What counts as a "major option change" that triggers price adjustment on the Hardox template?
- [ ] What is the base price for 19m3 alloy truck + dog combo?
- [ ] What is the base price for 20m3 alloy truck + dog combo?
- [ ] What counts as a major option change on the alloy combos?
- [ ] Are there separate pricing tiers for different hoist models?
- [ ] Does the tarp brand (EziTarp vs Pulltarp vs Razor) affect pricing?

### Staff / Initials
- [ ] Who is CT in "Prepared By" dropdown? (JW, JH, NW, CT)
- [ ] Who is NW in "Sales Person" — Nathan? And PS = Pete S?

### Standard Inclusions
- [ ] What are the standard inclusions in a 10m3 Hardox tipper quote?
- [ ] Does V.Orlandi refer to specific equipment? Which V.Orlandi product?
- [ ] What tarp brand/model is standard on the Hardox tipper?
- [ ] What hoist model is standard on the Hardox tipper?
- [ ] What axle setup is standard on the 19m3 and 20m3 alloy combos?

### VIN / Compliance
- [ ] What specific fields go on the VIN plate?
- [ ] What does the ABS compliance output need to contain?
- [ ] Who signs the engineer's cert and weight cert?

### MRPeasy
- [ ] How are MRPeasy part numbers structured? Are they per-assembly or per-component?
- [ ] Does MRPeasy have assembly-level pricing that can be used for cost rollup?
- [ ] Is the BOM in MRPeasy already structured by job type (tipper, trailer, etc.)?

### Production
- [ ] What goes on a work order that doesn't come from the quote?
- [ ] Are there standard production stages beyond the 7 already in the system?
- [ ] Does each job section have its own sign-off requirements on the job sheet?
