# Innovation Opportunities
*System architect view — quoting and production platform for YLZ / Wilesy*

---

## HIGH IMPACT FEATURE — Repeat Build Intelligence

Every time a quote is created and accepted, the system learns.
After 50+ accepted quotes, the system can:
- Suggest "This exact build was last quoted at $XX,XXX (QU-0042, March 2025)"
- Flag if a new quote is priced significantly above or below historical average
- Auto-fill pricing from last accepted quote for same truck brand + body type + dimensions

**Why this matters:** Pete currently carries all this pricing knowledge in his head.
When Pete is not available, no one can quote accurately. This system captures that knowledge permanently.

---

## HIGH IMPACT FEATURE — Compatibility Intelligence

Build a constraint engine that prevents impossible or non-compliant configurations:

- 5400mm body → can ONLY be a Dog trailer (not Semi) → auto-lock trailer model
- 10400mm body → ONLY Semi → lock axle configuration options
- Quarry spec width (2400mm) → flag that this requires different suspension offset
- Disc brake + EBS = valid; Drum brake + EBS = valid; Drum + ABS only = flag warning
- Hoist model × body weight → warn if undersized hoist selected
- Drawbar length → flag if shorter than minimum for turning radius compliance

**Why this matters:** Prevents costly engineering mistakes caught late in fabrication.

---

## HIGH IMPACT FEATURE — Payload / GVM Intelligence

Automatically calculate estimated tare weight and payload from configuration:
- Material thickness × dimensions × density → estimated body weight
- Add hoist, subframe, tarp system, running gear weights (from known parts data)
- Compare against truck GVM → flag if overweight
- Compare against expected payload for customer's use case → flag if undersized

**Why this matters:** Weight compliance is a legal requirement. Calculating this now
costs $0. Getting it wrong costs thousands in rework.

---

## HIGH IMPACT FEATURE — Build History & Digital Twin

Every accepted quote generates a permanent build record:
- Full specification snapshot at time of build
- Photos attached to job (from Google Drive)
- QA checklist completion state
- Timesheet hours by section
- Parts consumed (from BOM)
- Total actual cost vs quoted cost

After 2 years of data, YLZ will have a complete digital history of every body
and trailer ever built, searchable by customer, truck brand, body type, size.

**Why this matters:** When a customer calls about their trailer 5 years later, you
can instantly pull the exact spec, materials, and measurements.

---

## HIGH IMPACT FEATURE — Smart Quote Revision Tracking

Instead of PDFs with "Rev A / Rev B / Rev C", track quote revisions in the system:
- Each edit creates a new revision
- Diff view showing what changed
- Customer sees clean quote; internal sees full change history
- Price delta shown between revisions ("Added electric tarp → +$2,200")

---

## Automation Opportunities

### 1. Quote → Job Conversion (One Click)
When a quote is accepted:
- Auto-create job on Kanban board
- Auto-create Monday.com item
- Auto-generate job sheet Excel
- Auto-create MRPeasy manufacturing order (when API available)
- Auto-notify Keith's Schedule that a new job needs scheduling

### 2. Parts Pre-ordering Intelligence
Before a job starts fabrication:
- Check BOM against current stock in MRPeasy
- Identify long-lead-time items (Hyva hoists, axles, tarp systems)
- Auto-draft purchase orders for approval
- Alert: "Start job YLZ1085 — BPW axle set has 4-week lead time, order now"

### 3. Weekly Schedule Intelligence
- Cross-reference Keith's Schedule with due dates
- Flag jobs at risk of missing due date based on current queue depth
- Suggest re-scheduling options
- "YLZ1085 is due in 3 weeks but alloy workers are booked for 4 weeks"

### 4. Customer Quote Auto-Expiry
- Quote auto-expires at validDays (default 30)
- System emails customer reminder at day 25: "Your quote expires in 5 days"
- Expired quotes auto-convert to "Re-quote required" status with inflation note

### 5. Photo Auto-Attachment
- When job is in QC/Dispatch stage, prompt: "Upload final photos to complete job"
- Photos attach to build record permanently
- Can be included in handover sheet as "final product photos"

---

## Production Efficiency

### Split-Screen Quoting
Side-by-side comparison of two configurations with live price delta.
Useful for: "Should we go with BPW or Fuwa axles?" → shows $X difference instantly.

### Standard Notes Library
Pre-written standard notes for common situations:
- "Lead time: 8–10 weeks from deposit"
- "Price valid for 30 days subject to material price movements"
- "Body dimensions may vary ±25mm to suit specific truck chassis"
- "Tarp system by Razor Systems — 12-month warranty"
One-click insertion into quote notes field.

### Dealer Price Lists
Generate a dealer-specific price list for repeat dealers:
- Standard builds with agreed pricing
- PDF or portal view
- Updated quarterly

### Mobile-Friendly Workshop View
Job sheet on an iPad in the workshop:
- Current job specs
- Checklist completion
- Photo upload
- Time logging

---

## Data Analytics Opportunities

After 12 months of data:
- Average quote-to-acceptance rate by product type
- Most common configuration per truck brand
- Average actual hours vs quoted hours per build type
- Material cost trends (Hardox, aluminium prices)
- Customer repeat rate by dealer
- Seasonal demand patterns

---

## Quoting Speed Improvements

### Template Cloning
"This is similar to the Linfox quote from March — clone it and adjust dimensions."
One click → pre-fill all fields → adjust 3 dimensions → done.

### Recent Quotes Quick-Fill
Last 10 accepted quotes appear as "Fill from this quote" options at configurator start.

### Keyboard Navigation
Power users (Pete, Nathan) can tab through all fields without mouse.
Configurator validates and highlights fields that need attention.

---

## Features Worth Challenging Your Assumptions On

### 1. Skip the Full Configurator for Repeat Builds
Pete currently quotes the same 3 builds repeatedly (Hardox tipper, 19m3 combo, 20m3 combo).
For these: Show a ONE-PAGE form with only the truck brand and any changed options.
Everything else pre-fills. Quote is ready in 2 minutes.

### 2. The "Xero PDF → Job Sheet" Bridge May Be Obsolete
Currently: Pete quotes in Xero → prints PDF → drops in Job Sheet Creator → gets job sheet.
With the new system: Quote → immediately auto-generate job sheet.
The PDF import step should be eliminated, not improved.

### 3. Consider a Customer-Facing Quote Portal
Instead of emailing PDFs, send a link: "View your quote at ylz.app/quote/QU-0142"
Customer sees a clean web page with their configuration and pricing.
"Accept Quote" button triggers the conversion flow.
This eliminates the "did they receive the PDF?" problem.

### 4. ABS/Compliance Data as a Byproduct
Every configured trailer already captures all the data needed for ABS compliance:
- Axle make, type, rating, number
- Brake system
- Wheelbase
- Body length and mass
If we model this correctly, the compliance output is just a formatted print of existing data.
Zero extra work from the user.
