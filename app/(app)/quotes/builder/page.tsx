'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id?: string
  section: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sortOrder: number
}

interface QuoteForm {
  quoteNumber: string
  status: string
  customerName: string
  dealerName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  preparedBy: string
  salesPerson: string
  validDays: number
  buildType: string
  // truck body
  truckMaterial: string
  truckMountType: string
  truckFloorSheet: string
  truckSideSheet: string
  truckHoist: string
  truckPushLugs: string
  truckTarp: string
  truckCoupling: string
  truckControls: string
  truckHydraulics: string
  // trailer
  trailerModel: string
  trailerType: string
  trailerMaterial: string
  trailerAxleMake: string
  trailerAxleCount: number
  trailerAxleType: string
  trailerSuspension: string
  trailerStudPattern: string
  trailerTarp: string
  trailerPbs: string
  // engineering details — truck
  chassisMake: string
  chassisModel: string
  chassisVariant: string
  truckBodyLength: string
  truckBodyHeight: string
  truckGvm: string
  truckTare: string
  truckSubframeColour: string
  truckBodyColour: string
  // engineering details — trailer
  trailerBodyLength: string
  trailerBodyHeight: string
  trailerGtm: string
  trailerGcm: string
  trailerTare: string
  trailerChassisColour: string
  trailerBodyColour: string
  // shared engineering
  specialRequirements: string
  // engineering extras — truck
  truckPivotCentre: string
  truckTarpLength: string
  truckSerial: string
  truckVin: string
  truckMainRunnerWidth: string
  truckTailgateType: string
  truckTailgateLights: string
  truckTailLights: string
  // body extras
  truckSideLights: string
  truckSideLightsCustom: string
  truckIndicators: string
  truckAntiSpray: string
  truckShovelHolder: string
  truckMudflaps: string
  truckGrainDoors: string
  truckGrainLocks: string
  truckReverseBuzzer: string
  truckBodySpigot: string
  truckRockSheet: string
  truckLiner: string
  truckPto: string
  truckPump: string
  truckHydTankType: string
  truckHydTankLocation: string
  truckDValue: string
  truckCouplingLoad: string
  // engineering extras — trailer
  trailerSerial: string
  trailerVin: string
  trailerFloorSheet: string
  trailerSideSheet: string
  trailerHoist: string
  trailerPivotCentre: string
  trailerPushLugs: string
  trailerDrawbarLength: string
  trailerMainRunnerWidth: string
  // trailer drawbar
  trailerDrawbarTape: string
  trailerDrawbarCoupling: string
  trailerAndersonPlug: string
  trailerWheelCarrier: string
  trailerDropDownLeg: string
  trailerPogoStick: string
  trailerChassisLength: string
  trailerWheelbase: string
  trailerTailgateType: string
  trailerTailgateLights: string
  trailerTailLights: string
  trailerLockFlap: string
  // trailer extras
  trailerAxleLift: string
  trailerAxleLiftAxle: string
  trailerHubodometer: string
  trailerHubodoLocation: string
  trailerHubodoAxle: string
  trailerHoseBurstValve: string
  trailerTyre: string
  trailerInnerWheels: string
  trailerOuterWheels: string
  // trailer tarp extras
  trailerTarpColour: string
  trailerTarpMaterial: string
  trailerTarpType: string
  trailerTarpLocation: string
  trailerTarpLength: string
  trailerSideLights: string
  trailerSideLightsCustom: string
  trailerIndicators: string
  trailerGrainDoors: string
  trailerGrainLocks: string
  // trailer body extras
  trailerAntiSpray: string
  trailerRockSheet: string
  trailerLiner: string
  trailerRearLadder: string
  trailerCentreChain: string
  trailerCatMarkers: string
  trailerReflectors: string
  trailerCamera: string
  trailerVibrator: string
  // truck body extras
  truckBrakeCoupling: string
  truckLadderType: string
  truckLadderPosition: string
  truckSpreaderChain: string
  truckCatMarkers: string
  truckReflectors: string
  truckCamera: string
  truckVibrator: string
  truckHoseBurstValve: string
  truckChassisExtension: string
  // tarp breakdown (replaces single truckTarp dropdown in UI)
  truckTarpMaterial: string
  truckTarpColour: string
  truckTarpType: string
  truckTarpStyle: string
  truckTarpLocation: string
  // pricing
  lineItems: LineItem[]
  margin: number
  overhead: number
  discount: number
  useOverride: boolean
  overridePrice: string
  overrideNote: string
  // notes
  notes: string
  terms: string
  // decline
  declineReason: string
  // job link
  jobId: string
  // repairs / warranty
  repairDescription: string
  repairUnit: string
  repairWarranty: boolean
  repairOriginalJob: string
  // beavertail
  btDeckWidth: string
  btDeckLength: string
  btFlatDeckLength: string
  btTailLength: string
  btTailAngle: string
  btRampExtension: string
  btRampType: string
  btRampWidth: string
  btRampActualLength: string
  btRampCapacity: string
  btFloorPlate: string
  btCrossMembers: string
  btHydraulics: string
  btStabiliserLegs: string
  btChainPoints: string
  btToolbox: string
  btShovelRacks: string
  btLights: string
  btPaint: string
  btEngineeringNote: string
}

// ─── Chassis makes & models ───────────────────────────────────────────────────

const CHASSIS_MAKES = [
  'Kenworth', 'Mack', 'Western Star', 'Freightliner',
  'Hino', 'Isuzu', 'Fuso', 'UD Trucks',
  'Mercedes-Benz', 'Volvo', 'Scania', 'MAN', 'DAF',
]

const CHASSIS_MODELS: Record<string, string[]> = {
  'Kenworth':      ['T409', 'T610', 'T610SAR', 'T360', 'T410', 'T659', 'T909', 'C509', 'C540', 'T480'],
  'Mack':          ['Granite', 'Trident', 'Anthem', 'SuperLiner', 'Titan', 'Metro-Liner'],
  'Western Star':  ['4700', '4800', '4900', '5700', '6900'],
  'Freightliner':  ['Cascadia', 'Coronado', 'Argosy', '114SD'],
  'Hino':          ['500 Series FC', '500 Series FD', '500 Series FE', '500 Series FG',
                    '700 Series FM', '700 Series FS', '300 Series'],
  'Isuzu':         ['FVZ 260-300', 'FVD 1000', 'FVY 1400', 'FVL 1400', 'FVR 900',
                    'CXZ 400', 'CXY 350', 'EXZ 440'],
  'Fuso':          ['FP 54', 'FN 61', 'FV 54', 'FM 65', 'FS 55', 'FZ 60'],
  'UD Trucks':     ['Quon GW 26', 'Quon CD 14', 'Croner PKE 250'],
  'Mercedes-Benz': ['Actros 2644', 'Actros 2653', 'Arocs 3240', 'Axor 2633', 'Atego 1623'],
  'Volvo':         ['FMX 460', 'FMX 500', 'FH 540', 'FM 370', 'FLD 22'],
  'Scania':        ['P 360', 'P 410', 'G 410', 'G 500', 'R 500', 'R 580', 'S 580'],
  'MAN':           ['TGS 26.480', 'TGS 35.480', 'TGX 26.560', 'TGM 18.250'],
  'DAF':           ['CF 480', 'XF 530', 'XG 530'],
}

// ─── Options ──────────────────────────────────────────────────────────────────

const MATERIALS = ['Hardox 500', 'Aluminium', 'Hardox 450', 'Steel']
const MOUNT_TYPES = ['Well Mount Body', 'Front Mount Body']
const HOISTS = ['Binotto 3190', 'Hyva Alpha 092', 'Hyva Alpha 190', 'PH122 Kröger',
  'MFB3126.3.2840', 'MFB3126.3.2960', 'HPF3070-135-3-S3', 'MFB3126.3.3190', 'MFB3126.4.3310', 'None']

// Auto-lookup: body width from material
function calcBodyWidth(material: string): string {
  if (material === 'Aluminium') return '2290'
  return '2250'
}

// Auto-lookup: body capacity (m³) from dimensions and mount/body type
// Truck well mount: L×W×H minus 0.3m³ | Truck front mount: L×W×H | Trailer: L×W×H minus 0.5m³
function calcBodyCapacity(bodyLength: string, material: string, bodyHeight: string, mode: 'truck', mountType: string): string
function calcBodyCapacity(bodyLength: string, material: string, bodyHeight: string, mode: 'trailer'): string
function calcBodyCapacity(bodyLength: string, material: string, bodyHeight: string, mode: 'truck' | 'trailer', mountType?: string): string {
  const l = parseInt(bodyLength, 10)
  const w = parseInt(calcBodyWidth(material), 10)
  const h = parseInt(bodyHeight, 10)
  if (isNaN(l) || isNaN(h)) return ''
  const rawM3 = (l / 1000) * (w / 1000) * (h / 1000)
  const offset = mode === 'trailer' ? 0.5 : (mountType === 'Well Mount Body' ? 0.3 : 0)
  const result = rawM3 - offset
  return result > 0 ? result.toFixed(1) : ''
}

// Auto-lookup: booster settings & slack lengths from axle make, type, count
type AxleSettings = { boosters: string[]; slacks: string[] }
const AXLE_SETTINGS: Record<string, AxleSettings> = {
  'SAF|Drum|3': { boosters: ['30', '2430', '2430'], slacks: ['127', '127', '127'] },
  'SAF|Drum|4': { boosters: ['30', '3030', '2430', '2430'], slacks: ['152', '152', '127', '127'] },
  'SAF|Drum|5': { boosters: ['24', '24', '2430', '2430', '2430'], slacks: ['178', '178', '127', '127', '127'] },
  'SAF|Disc|3': { boosters: ['22', '22', '1216'], slacks: ['88', '88', '88'] },
  'SAF|Disc|4': { boosters: ['22', '22', '1216', '1216'], slacks: ['88', '88', '88', '88'] },
  'SAF|Disc|5': { boosters: ['24', '24', '1216', '1216', '1216'], slacks: ['88', '88', '88', '88', '88'] },
}
function getAxleSettings(axleMake: string, axleType: string, axleCount: number): AxleSettings | null {
  const brakeType = axleType.startsWith('Drum') ? 'Drum' : axleType.startsWith('Disc') ? 'Disc' : null
  if (!brakeType) return null
  return AXLE_SETTINGS[`${axleMake}|${brakeType}|${axleCount}`] || null
}

// Auto-lookup: tarp bow height from material, body type, length, height
function calcTarpBowHeight(material: string, isDogTrailer: boolean, bodyLength: string, bodyHeight: string): string {
  const length = parseInt(bodyLength, 10)
  const height = parseInt(bodyHeight, 10)
  if (material === 'Aluminium') return '250mm'
  if (isDogTrailer) return '320mm'
  // Hardox truck bodies: 1000mm body height = 450mm bow, 1100mm = 380mm bow
  if (height === 1000) return '450mm'
  if (height === 1100) return '380mm'
  return ''
}

// Trailer body length → C/L Pivot to Rear (mm)
const TRAILER_BODY_LENGTHS = ['5400', '6000', '6100', '7700', '8300', '9200']

const TRAILER_TYRES = [
  'Adventurers LR188',
  'Austyre ST01',
  'Austyre Transit',
  'Bridgestone R187',
  'Loadrunner LR188',
  'Remington R628',
  'Austyre Adventurer',
]
const TRAILER_WHEELS = [
  'Alcoa Machine Finished 22.5x8.25 LVL1 - 285',
  'Alcoa Dura Bright 8.25x22.5 - 285',
  'Ogreen Machine Finished 22.5x8.25 - 285',
  'Ogreen Polished Finished 22.5x8.25 - 285',
  'Super Light Machined 22.5x8.25 - 285',
  'Super Light Polished 22.5x8.25 - 285',
  'Alcoa Machine Finished 22.5x8.25 LVL1 - 335',
  'Alcoa Dura Bright 8.25x22.5 - 335',
  'Ogreen Machine Finished 22.5x8.25 - 335',
  'Ogreen Polished Finished 22.5x8.25 - 335',
  'Super Light Machined 22.5x8.25 - 335',
  'Super Light Polished 22.5x8.25 - 335',
]

const TRAILER_PIVOT_MAP: Record<string, string> = {
  '5400': '450',
  '6000': '510',
  '6100': '610',
  '7700': '190',
  '8300': '330',
  '9200': '225',
}
function getTrailerPivotCentre(bodyLength: string): string {
  return TRAILER_PIVOT_MAP[bodyLength?.toString().trim()] || ''
}

const TRAILER_HOIST_MAP: Record<string, string> = {
  '5400': 'HPF3740-135-4-S3',
  '6000': 'MFB3145.4.4110',
  '6100': 'MFB3145.4.4110',
  '7700': 'MFB3165.5.5635',
  '8300': 'HPF5730-174-5-S3H',
  '9200': 'MFB3187.5.6635',
}

// Auto-lookup: truck body length → hoist model & pivot centre (mm)
const TRUCK_BODY_HOIST_MAP: Record<string, { hoist: string; pivotCentre: string }> = {
  '4200': { hoist: 'MFB3126.3.2840', pivotCentre: '3500' },
  '4300': { hoist: 'MFB3126.3.2840', pivotCentre: '3570' },
  '4400': { hoist: 'MFB3126.3.2960', pivotCentre: '3600' },
  '4500': { hoist: 'HPF3070-135-3-S3', pivotCentre: '3800' },
  '4600': { hoist: 'MFB3126.3.3190', pivotCentre: '3900' },
  '4660': { hoist: 'MFB3126.3.3190', pivotCentre: '3900' },
  '4700': { hoist: 'MFB3126.3.3190', pivotCentre: '3950' },
  '4800': { hoist: 'MFB3126.4.3310', pivotCentre: '4150' },
  '4900': { hoist: 'MFB3126.4.3310', pivotCentre: '4200' },
}
const TARPS = ['None', 'Manual', 'Razor Electric', 'Roll Right Electric', 'Pull Out']
const COUPLINGS = ['V.Orlandi', 'Bartlett Ball 127mm', 'Pintle Hook PH300 with Air Cushion', 'None']
const CONTROLS = [
  'Electric hand controller',
  'In-cab controller',
  'OEM switches in dash',
  'Already supplied',
  'From remote',
  'None',
]
const HYDRAULICS_TRUCK = ['Single spool valve', 'Truck and Trailer spool valve', 'None']
const HYDRAULICS_TRUCK_AND_DOG = ['Truck and Trailer spool valve', 'None']
const PUMP_OPTIONS = [
  'None',
  '500-223 — OMFB DTH182 ISO 82L (Standard)',
  'Customer Supplied',
]
const PTO_OPTIONS = [
  'None',
  // Generic
  'Road Ranger style PTO',
  'Gearbox PTO',
  'Engine PTO',
  'Customer Supplied',
  // Kenworth / DAF (Paccar)
  '500-214 — Paccar TX18 Hydreco (Kenworth/DAF)',
  // Mercedes
  '500-123 — Mercedes G230-12 ISO4B Kit',
  '500-135 — Mercedes G230 ISO4B',
  '500-18 — Mercedes G230-12',
  '500-220 — Mercedes OMFB Kit',
  // ZF / Eaton
  '500-136 — ZF/Eaton PZB3B',
  '500-221 — ZF OMFB Kit (ISO)',
  '500-222 — ZF OMFB Kit (small)',
  '500-24 — ZF OMFB Kit',
  '500-73 — ZF 12AS 2330 TD',
  // Volvo
  '500-165 — Volvo VT-C ISO4B Air',
  '500-251 — Volvo OMFB (VOL024ISO)',
  '500-252 — Volvo OMFB (VOL025ISO)',
  // Fuller
  '500-97 — Fuller RT906 PZB3B Air',
  '500-216 — Fuller OMFB Kit',
  // Job specific
  '500-75 — Job Specific PTO Kit',
]
const TAILGATE_TYPES = ['Fixed', '2 Way', 'Single Drop', 'Bi-fold', 'Forward Hinged Only', 'No Tailgate']
const TAILGATE_LIGHTS = ['None', '4 Per Side Round LED', 'LED Strip', 'LED Cluster', 'Reverse Light Only', 'Other']
const TAIL_LIGHTS = [
  '4 hole round LEDs c/w chrome surround',
  '5 hole round LEDs c/w chrome surround',
  '7 hole round LEDs c/w chrome surround',
  'LED cluster combination lights',
  'Narva LED combination lights',
  'Hella LED combination lights',
  'Reuse Existing OEM Taillights',
  'Customer supplied',
  'None',
]
const SIDE_LIGHTS = [
  'None',
  '3 side lights c/w polished backing strip',
  '5 side lights c/w polished backing strip',
  '7 side lights c/w polished backing strip',
  'Customer supplied',
  'Define quantity...',
]
const INDICATORS = [
  'None',
  '1x in centre',
  '1x front / 1x centre / 1x rear',
]
const MUDFLAPS_OPTIONS = [
  'None',
  'Full set - 4 mudflaps across rear',
  '2 mudflaps - rear driverside & nearside',
  'Customer supplied',
]
const HYD_TANK_TYPES = [
  'Factory supplied',
  'Split existing tank',
  // Behind Cab (BRS series)
  'TKBRS135S (135L) — 500-232',
  'TKBRS150S (150L) — 500-234',
  'TKBRS200S (200L) — 500-235',
  // Sleeper Box (VER series)
  'TKVER070S (70L) Sleeper Box — 500-228',
  'TKVER105S (105L) Sleeper Box — 500-229',
  'TKVER130S (130L) Sleeper Box — 500-230',
  'TKVER160S (160L) Sleeper Box — 500-254',
  'TKVER200S (200L) Sleeper Box — 500-231',
]
const HYD_TANK_LOCATIONS = [
  'Centre Front of Subframe',
  'LH Front of Subframe',
  'RH Front of Subframe',
  'Chassis LH',
  'Chassis RH',
]
const BRAKE_COUPLINGS = ['Duomatic', 'Triomatic', 'Duomatic & Triomatic', 'None']
const LADDER_TYPES = [
  '3-Step Pull out ladder c/w rungs',
  '2-Step Pull out ladder c/w rungs',
  'Fixed ladder',
  'No Ladder',
]
const LADDER_POSITIONS = [
  'Driverside Front', 'Nearside Front',
  'Driverside Rear', 'Nearside Rear',
  'Both Sides Front',
]
const TARP_MATERIALS = ['PVC', 'Mesh', 'PVC or Mesh (customer choice)', 'None']
const TARP_TYPES = ['Hoop Type', 'Roll Type']
const TARP_STYLES = ['None', 'Manual', 'Razor Electric', 'Roll Right Electric', 'Pull Out']
const TARP_LOCATIONS = ['Standard Out Front', 'Internal Through Top Rail', 'Rear Mounted', 'Other']

// Chassis length lookup — body length → chassis length
const CHASSIS_LENGTH_MAP: Record<number, number> = {
  5300: 4930, 5350: 4930, 5400: 4930,
  6000: 5450, 6100: 5450,
  7700: 7470,
  8300: 7870,
  9200: 8950, 9600: 8950,
  10200: 9450,
}

function getChassisLength(bodyLength: string): string {
  const n = parseInt(bodyLength.replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? '' : String(CHASSIS_LENGTH_MAP[n] ?? '')
}

function getCouplingLoad(coupling: string): string {
  if (!coupling || coupling === 'None') return ''
  if (coupling.toLowerCase().includes('pintle')) return '8.1T'
  if (coupling === 'V.Orlandi' || coupling.toLowerCase().includes('bartlett') || coupling === 'Ringfeder') return '2.5T'
  return ''
}
const TRAILER_MODELS = [
  'DT-3 (3-Axle Dog)', 'DT-4 (4-Axle Dog)', 'DT-5 (5-Axle Dog)',
  'ST-2 (2-Axle Semi)', 'ST-3 (3-Axle Semi)',
  'CD-2 (2-Axle Convertor Dolly)', 'CD-3 (3-Axle Convertor Dolly)',
]
const TRAILER_TYPES = ['P Beam', 'I Beam', 'Converter Dolly']
const AXLE_MAKES = ['SAF', 'BPW', 'Fuwa', 'TMC']
const AXLE_TYPES = ['Drum', 'Disc', 'Drum or Disc (customer choice)']
const STUD_PATTERNS = ['285PCD', '335PCD']
const SUSPENSIONS = ['Air', 'Mechanical']
const BUILD_TYPES = [
  { value: 'truck-body', label: '🚛 Truck Body' },
  { value: 'trailer', label: '🚜 Trailer' },
  { value: 'truck-and-trailer', label: '🚛🚜 Truck + Trailer' },
  { value: 'beavertail', label: '🔧 Beavertail' },
  { value: 'tag-trailer', label: '🏗️ Tag Trailer' },
  { value: 'repairs', label: '🔩 Repairs / Warranty' },
]
const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'declined', 'expired']

const DEFAULT_TERMS = `Purchase Order Requirement
Acceptance of this quote confirms your intention to proceed with the order. A valid Purchase Order (PO) must be provided at the time of acceptance. No production or scheduling will commence until the PO has been received.

Quote Validity
This quote is valid for 30 days from the date of issue unless otherwise agreed in writing. After this period, pricing and availability may be subject to change.

Pricing
All prices quoted are exclusive of GST unless otherwise stated. Prices may be revised if specifications or quantities change after acceptance.

Lead Times
Production timelines begin only after receipt of the Purchase Order and any required deposit or approvals.

Cancellations & Amendments
Orders changed or cancelled after PO submission may incur additional costs, depending on the progress of production.`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function defaultSheets(material: string) {
  if (material === 'Hardox 500') return { floor: '6mm Hardox 500', side: '5mm Hardox 500' }
  if (material === 'Hardox 450') return { floor: '6mm Hardox 450', side: '5mm Hardox 450' }
  if (material === 'Aluminium') return { floor: '8mm Aluminium', side: '5mm Aluminium' }
  return { floor: '5mm Steel', side: '4mm Steel' }
}

// ─── Spec text generation ──────────────────────────────────────────────────────

function fmtDim(val: string): string {
  const n = parseInt(val.replace(/[^\d]/g, ''), 10)
  return isNaN(n) ? val : n.toLocaleString('en-AU')
}

function generateTruckBodySpec(form: QuoteForm): string {
  const isAlloy = form.truckMaterial === 'Aluminium'
  const L = form.truckBodyLength ? fmtDim(form.truckBodyLength) : '—'
  const W = fmtDim(calcBodyWidth(form.truckMaterial))
  const H = form.truckBodyHeight ? fmtDim(form.truckBodyHeight) : '—'

  const lines: string[] = []
  lines.push('SERIAL:')
  lines.push('VIN:')
  if (form.chassisMake || form.chassisModel) {
    lines.push('')
    if (form.chassisMake)  lines.push(`CHASSIS MAKE: ${form.chassisMake}`)
    if (form.chassisModel) lines.push(`CHASSIS MODEL: ${form.chassisModel}`)
  }
  lines.push('')
  lines.push(`${isAlloy ? 'Aluminium' : form.truckMaterial} ${form.truckMountType.toLowerCase()} ${L}L x ${W}W x ${H}H mm (Internal)`)
  const cap = calcBodyCapacity(form.truckBodyLength, form.truckMaterial, form.truckBodyHeight, 'truck', form.truckMountType)
  if (cap) lines.push(`Body capacity: ${cap}m³`)
  if (form.truckGvm) lines.push(`GVM: ${fmtDim(form.truckGvm)}kg`)
  lines.push('')
  if (isAlloy) {
    lines.push('Full aluminium construction')
    lines.push(`${form.truckFloorSheet} floor plate`)
    lines.push(`${form.truckSideSheet} side and end walls`)
    lines.push('Extruded aluminium corner posts')
  } else {
    lines.push(`${form.truckMaterial} construction throughout`)
    lines.push(`${form.truckFloorSheet} floor plate`)
    lines.push(`${form.truckSideSheet} side and end walls`)
  }
  lines.push('Sub frame - 150 x 75 RHS box section')
  lines.push('')
  if (form.truckHoist !== 'None') lines.push(`${form.truckHoist} hydraulic hoist`)
  if (form.truckCoupling !== 'None') lines.push(`${form.truckCoupling} coupling`)
  if (form.truckBrakeCoupling && form.truckBrakeCoupling !== 'None') lines.push(`${form.truckBrakeCoupling} brake coupling`)
  if (form.truckControls !== 'None') lines.push(form.truckControls)
  if (form.truckHydraulics !== 'None') lines.push(form.truckHydraulics)
  lines.push('')
  // Tarp
  if (form.truckTarpMaterial && form.truckTarpMaterial !== 'None') {
    const tarpParts = [form.truckTarpMaterial]
    if (form.truckTarpColour) tarpParts.push(form.truckTarpColour)
    tarpParts.push(form.truckTarpType || 'Hoop Type')
    if (form.truckTarpStyle) tarpParts.push(form.truckTarpStyle)
    const bowH = calcTarpBowHeight(form.truckMaterial, false, form.truckBodyLength, form.truckBodyHeight)
    if (bowH) tarpParts.push(`${bowH} bow`)
    if (form.truckTarpLocation) tarpParts.push(form.truckTarpLocation)
    lines.push(`Tarp: ${tarpParts.join(' — ')}`)
  }
  // Underbody access ladder — always included
  lines.push('Underbody access ladder')
  // External ladder
  if (form.truckLadderType && form.truckLadderType !== 'No Ladder') {
    lines.push(`${form.truckLadderType} — ${form.truckLadderPosition || 'Driverside Front'}`)
  }
  // Spreader chain
  if (form.truckSpreaderChain === 'Yes') lines.push('Spreader chain included')
  // Extras
  if (form.truckCatMarkers === 'Yes') lines.push('Rear CAT markers')
  if (form.truckReflectors) lines.push(`Reflectors: ${form.truckReflectors}`)
  if (form.truckCamera && form.truckCamera !== 'No') lines.push(`Camera: ${form.truckCamera}`)
  if (form.truckVibrator === 'Yes') lines.push('Vibrator fitted')
  if (form.truckHoseBurstValve === 'Yes') lines.push('Hose burst valve fitted')
  if (form.truckChassisExtension === 'Yes') lines.push('Chassis extension fitted')
  lines.push('LED lighting throughout')
  if (form.truckSubframeColour || form.truckBodyColour) {
    const parts = []
    if (form.truckSubframeColour) parts.push(`Subframe: ${form.truckSubframeColour}`)
    if (form.truckBodyColour) parts.push(`Body: ${form.truckBodyColour}`)
    lines.push(`Paint: ${parts.join(' / ')}`)
  }

  // Trim trailing blank lines
  while (lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

function generateTrailerSpec(form: QuoteForm): string {
  const isAlloy = form.trailerMaterial === 'Aluminium'
  const axleCount = form.trailerAxleCount
  const L = form.trailerBodyLength ? fmtDim(form.trailerBodyLength) : '—'
  const W = fmtDim(calcBodyWidth(form.trailerMaterial))
  const H = form.trailerBodyHeight ? fmtDim(form.trailerBodyHeight) : '—'
  const axleTypeLabel = form.trailerAxleType === 'Drum or Disc (customer choice)' ? 'Drum or Disc' : form.trailerAxleType

  const lines: string[] = []
  lines.push('SERIAL:')
  lines.push('VIN:')
  lines.push('')
  lines.push(`${axleCount}-axle Dog Trailer ${L}L x ${W}W x ${H}H mm (Internal)`)
  const cap = calcBodyCapacity(form.trailerBodyLength, form.trailerMaterial, form.trailerBodyHeight, 'trailer')
  if (cap) lines.push(`Body capacity: ${cap}m³`)
  if (form.trailerGtm) lines.push(`GTM: ${fmtDim(form.trailerGtm)}kg`)
  if (form.trailerGcm) lines.push(`GCM: ${fmtDim(form.trailerGcm)}kg`)
  lines.push('')
  if (isAlloy) {
    lines.push('Full aluminium construction')
    lines.push(`${form.trailerType} frame construction with flat top deck`)
    lines.push(`${L} x ${W}mm floor 5mm aluminium tread plate`)
    lines.push('Side walls - 5mm aluminium')
    lines.push('End walls - 5mm aluminium')
    lines.push('Extruded aluminium corner posts')
  } else {
    lines.push(`${form.trailerMaterial} construction throughout`)
    lines.push(`${form.trailerType} frame construction with flat top deck`)
    const isHardox = form.trailerMaterial.startsWith('Hardox')
    lines.push(`${L} x ${W}mm floor ${isHardox ? `6mm ${form.trailerMaterial} plate` : '6mm plate'}`)
    lines.push(`Side walls - ${isHardox ? `5mm ${form.trailerMaterial}` : '5mm plate'}`)
    lines.push(`End walls - ${isHardox ? `5mm ${form.trailerMaterial}` : '5mm plate'}`)
  }
  lines.push('Sub frame - 150 x 75 RHS box section')
  lines.push('')
  lines.push('Running gear')
  lines.push(`${axleCount} x ${form.trailerAxleMake} ${axleTypeLabel} brake axles`)
  lines.push(`${form.trailerAxleMake} ${form.trailerSuspension} suspension`)
  lines.push(`${axleTypeLabel} brakes`)
  const axleS = getAxleSettings(form.trailerAxleMake, form.trailerAxleType, form.trailerAxleCount)
  if (axleS) {
    lines.push(`Booster settings: ${axleS.boosters.join(' / ')}`)
    lines.push(`Slack lengths: ${axleS.slacks.map(s => `${s}mm`).join(' / ')}`)
  }
  lines.push(`Alcoa Dura-Bright aluminium wheels — ${form.trailerStudPattern}`)
  lines.push('ST315/80R22.5 tyres')
  lines.push('')
  if (form.trailerAxleLift === 'Yes') lines.push(`Axle lift — ${form.trailerAxleLiftAxle || 'TBC'}`)
  if (form.trailerHubodometer === 'Yes') {
    const loc = form.trailerHubodoLocation || 'TBC'
    const axle = form.trailerHubodoAxle || 'TBC'
    lines.push(`Hubodometer — ${loc}, ${axle}`)
  }
  if (form.trailerHoseBurstValve === 'Yes') lines.push('Hose burst valve fitted')
  lines.push('')
  if (form.trailerTarp !== 'None') {
    const bowH = calcTarpBowHeight(form.trailerMaterial, form.trailerModel.startsWith('DT-'), form.trailerBodyLength, form.trailerBodyHeight)
    lines.push(`${form.trailerTarp} tarp system${bowH ? ` — ${bowH} bow` : ''}`)
  }
  lines.push('LED lighting throughout')
  if (form.trailerChassisColour || form.trailerBodyColour) {
    const parts = []
    if (form.trailerChassisColour) parts.push(`Chassis: ${form.trailerChassisColour}`)
    if (form.trailerBodyColour) parts.push(`Body: ${form.trailerBodyColour}`)
    lines.push(`Paint: ${parts.join(' / ')}`)
  }
  if (form.trailerPbs) lines.push(`\n*PBS certification ${form.trailerPbs}`)

  while (lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

function emptyForm(quoteNumber = ''): QuoteForm {
  return {
    quoteNumber,
    status: 'draft',
    customerName: '', dealerName: '', contactName: '',
    contactEmail: '', contactPhone: '',
    preparedBy: '', salesPerson: '', validDays: 30,
    buildType: 'truck-body',
    truckMaterial: 'Hardox 500',
    truckMountType: 'Well Mount Body',
    truckFloorSheet: '6mm Hardox 500',
    truckSideSheet: '5mm Hardox 500',
    truckHoist: 'Binotto 3190',
    truckPushLugs: '',
    truckTarp: 'Razor PVC/MESH Electric',
    truckCoupling: 'V.Orlandi',
    truckControls: 'Electric hand controller',
    truckHydraulics: 'Single spool valve',
    trailerModel: 'DT-4 (4-Axle Dog)',
    trailerType: 'P Beam',
    trailerMaterial: 'Aluminium',
    trailerAxleMake: 'SAF',
    trailerAxleCount: 4,
    trailerAxleType: 'Drum or Disc (customer choice)',
    trailerSuspension: 'Air',
    trailerStudPattern: '285PCD',
    trailerTarp: 'Razor PVC/MESH Electric',
    trailerPbs: '',
    chassisMake: '', chassisModel: '', chassisVariant: '',
    truckBodyLength: '', truckBodyHeight: '',
    truckGvm: '', truckTare: '', truckSubframeColour: '', truckBodyColour: '',
    trailerBodyLength: '', trailerBodyHeight: '',
    trailerGtm: '', trailerGcm: '',
    trailerTare: '', trailerChassisColour: '', trailerBodyColour: '',
    specialRequirements: '',
    truckPivotCentre: '235',
    truckTarpLength: '',
    truckSerial: '', truckVin: '', truckMainRunnerWidth: '',
    truckTailgateType: 'Single Drop', truckTailgateLights: 'None', truckTailLights: 'Use existing OEM tail lights',
    truckSideLights: 'None', truckSideLightsCustom: '', truckIndicators: 'None', truckAntiSpray: 'No', truckShovelHolder: 'No', truckMudflaps: 'None',
    truckGrainDoors: 'No', truckGrainLocks: 'No', truckReverseBuzzer: 'None', truckBodySpigot: 'No', truckRockSheet: 'No', truckLiner: 'No',
    truckPto: 'None', truckPump: 'None', truckHydTankType: 'Factory supplied',
    truckHydTankLocation: 'Centre Front of Subframe', truckDValue: '', truckCouplingLoad: '',
    truckBrakeCoupling: 'Duomatic',
    truckLadderType: '3-Step Pull out ladder c/w rungs',
    truckLadderPosition: 'Driverside Front',
    truckSpreaderChain: 'No',
    truckCatMarkers: 'Yes',
    truckReflectors: '',
    truckCamera: 'No',
    truckVibrator: 'No',
    truckHoseBurstValve: 'No',
    truckChassisExtension: 'No',
    truckTarpMaterial: 'PVC',
    truckTarpColour: '',
    truckTarpType: 'Hoop Type',
    truckTarpStyle: 'Razor Electric',
    truckTarpLocation: 'Standard Out Front',
    trailerSerial: '', trailerVin: '', trailerFloorSheet: '', trailerSideSheet: '',
    trailerHoist: '', trailerPivotCentre: '', trailerPushLugs: '', trailerDrawbarLength: '', trailerMainRunnerWidth: '',
    trailerDrawbarTape: 'No', trailerDrawbarCoupling: 'To suit V.Orlandi', trailerAndersonPlug: 'Yes', trailerWheelCarrier: 'No', trailerDropDownLeg: 'Drop Down', trailerPogoStick: 'No',
    trailerChassisLength: '', trailerWheelbase: '',
    trailerTailgateType: 'Single Drop', trailerTailgateLights: 'None', trailerTailLights: '4 hole round LEDs c/w chrome surround', trailerLockFlap: 'No',
    trailerAxleLift: 'No', trailerAxleLiftAxle: '', trailerHubodometer: 'Yes', trailerHubodoLocation: '', trailerHubodoAxle: '', trailerHoseBurstValve: 'Yes',
    trailerTyre: '', trailerInnerWheels: '', trailerOuterWheels: '',
    trailerTarpColour: '', trailerTarpMaterial: 'PVC', trailerTarpType: 'Hoop Type', trailerTarpLocation: 'Standard Out Front', trailerTarpLength: '',
    trailerSideLights: 'None', trailerSideLightsCustom: '', trailerIndicators: 'None', trailerGrainDoors: 'No', trailerGrainLocks: 'No',
    trailerAntiSpray: 'No', trailerRockSheet: 'No', trailerLiner: 'No',
    trailerRearLadder: 'No', trailerCentreChain: 'No', trailerCatMarkers: 'No', trailerReflectors: 'Yes (Amber)', trailerCamera: 'No', trailerVibrator: 'No',
    lineItems: [],
    margin: 0, overhead: 0, discount: 0,
    useOverride: false, overridePrice: '', overrideNote: '',
    notes: '', terms: DEFAULT_TERMS,
    declineReason: '',
    jobId: '',
    repairDescription: '', repairUnit: '', repairWarranty: false, repairOriginalJob: '',
    btDeckWidth: '2470', btDeckLength: '8500', btFlatDeckLength: '7000',
    btTailLength: '1200', btTailAngle: '15', btRampExtension: '300',
    btRampType: 'Twin Ramps', btRampWidth: '800', btRampActualLength: '2700', btRampCapacity: '12T',
    btFloorPlate: '5mm checkered plate', btCrossMembers: '400mm',
    btHydraulics: 'Hydraulic Power pack 3000 PSI, double controls with push button hand control and key switch isolator',
    btStabiliserLegs: '2 x stabilising legs rated at 10T',
    btChainPoints: '4 x key chain points per side',
    btToolbox: '900 x 450 x 450',
    btShovelRacks: '2 x shovel racks to headboard behind cabin',
    btLights: 'Jumbo LED tail lights and side marker lamps',
    btPaint: 'Etch primed and painted with PPG 2pack systems. Colour match to cab.',
    btEngineeringNote: 'subject to final engineering and approval',
  }
}

function buildBeavertailSpec(form: QuoteForm): string {
  return [
    `Beavertail with Twin Ramps.`,
    `Beavertail section`,
    `Size: ${form.btDeckWidth}W x ${form.btDeckLength}L (${form.btFlatDeckLength}mm flat deck section, ${form.btTailLength}mm tail, ${form.btRampExtension}mm ramps)`,
    form.btEngineeringNote ? `*${form.btEngineeringNote}*` : null,
    `Profile laser cut side rails with heavy cross-members spaced ${form.btCrossMembers}.`,
    `${form.btFloorPlate} floor fully welded.`,
    `Laser cut profiling on twin ramps.`,
    `Twin Ramps; ${form.btRampWidth}mm Wide, ${form.btRampActualLength}mm long, ${form.btFloorPlate}, rated at ${form.btRampCapacity} capacity.`,
    `Traction bars - lashing chains/ratchets to secure ramps.`,
    form.btHydraulics ? `${form.btHydraulics}.` : null,
    `${form.btTailLength}mm beavertail section at ${form.btTailAngle} degree angle with traction bars.`,
    form.btStabiliserLegs ? `${form.btStabiliserLegs}.` : null,
    form.btChainPoints ? `${form.btChainPoints}.` : null,
    `Side coaming finished flush with deck level.`,
    `Laser cut rope rails.`,
    form.btLights ? `${form.btLights}.` : null,
    form.btPaint || null,
    `Steps and handles to both sides of tray.`,
    form.btShovelRacks ? `${form.btShovelRacks}.` : null,
    form.btToolbox ? `Tool box - powder coated black. ${form.btToolbox}. Twin lockable door handles. Waterproof seal.` : null,
  ].filter(Boolean).join('\n')
}

function buildTagTrailerSpec(form: QuoteForm): string {
  return [
    `3-Axle Tag Trailer with Twin Hydraulic Ramps.`,
    `Size: ${form.btDeckWidth}W × ${form.btFlatDeckLength}mm flat deck + ${form.btTailLength}mm beavertail section`,
    form.btEngineeringNote ? `*${form.btEngineeringNote}*` : null,
    `${form.btFloorPlate} floor fully welded.`,
    form.btCrossMembers ? `${form.btCrossMembers} cross members.` : null,
    `${form.btChainPoints}.`,
    form.btToolbox ? `Hammer well ${form.btToolbox}.` : null,
    `${form.btRampType}: ${form.btRampWidth}mm × ${form.btRampActualLength}mm with laser cut profiling and internal structure.`,
    form.btHydraulics ? `${form.btHydraulics}.` : null,
    form.btStabiliserLegs ? `${form.btStabiliserLegs}.` : null,
    form.btLights ? `${form.btLights}.` : null,
    `${form.trailerAxleMake} Intra series ${form.trailerAxleCount}-axle ${form.trailerAxleType}.`,
    form.trailerSuspension ? `${form.trailerSuspension}.` : null,
    `ADR approved ${form.trailerAxleCount}-axle EBS braking system (multi-volt).`,
    `255R70×22.5 low profile Austyre tyres. Alcoa polished outer wheels, Alcoa machined inner wheels. Wheel alignment. Spare wheel and tyre on wound-up rack.`,
    `Duo-matic air fittings to suit truck. 16mm safety chains.`,
    `Pintle hook/ring feeder or Bartlett ball tow hitch (specify at order).`,
    form.btPaint || null,
    `Complete set of YLZ mudflaps.`,
    form.btShovelRacks ? `${form.btShovelRacks}.` : null,
  ].filter(Boolean).join('\n')
}

function applyTemplateConfig(form: QuoteForm, cfg: Record<string, any>, template?: any) {
  form.buildType = cfg.buildType || form.buildType

  if (form.buildType === 'truck-and-trailer') {
    const tc = cfg.truckConfig || {}
    const trc = cfg.trailerConfig || {}
    if (tc.material) form.truckMaterial = tc.material
    if (tc.mountType) form.truckMountType = tc.mountType
    if (tc.hoist) form.truckHoist = tc.hoist
    if (tc.tarpSystem) form.truckTarp = tc.tarpSystem
    if (tc.coupling) form.truckCoupling = tc.coupling
    if (tc.controls) form.truckControls = tc.controls
    if (tc.hydraulics) form.truckHydraulics = tc.hydraulics
    const ts = defaultSheets(form.truckMaterial)
    form.truckFloorSheet = tc.floorSheet || ts.floor
    form.truckSideSheet = tc.sideSheet || ts.side

    if (trc.trailerModel) form.trailerModel = trc.trailerModel
    if (trc.trailerType) form.trailerType = trc.trailerType
    if (trc.material) form.trailerMaterial = trc.material
    if (trc.axleMake) form.trailerAxleMake = trc.axleMake
    if (trc.axleCount) form.trailerAxleCount = Number(trc.axleCount)
    if (trc.axleType) form.trailerAxleType = trc.axleType
    if (trc.suspension) {
      const rawSusp = trc.suspension as string
      // Normalise legacy values (SAF Air Ride, Air bag suspension, Rubber → Air or Mechanical)
      form.trailerSuspension = rawSusp.toLowerCase().includes('mechanical') || rawSusp.toLowerCase().includes('rubber') ? 'Mechanical' : 'Air'
    }
    if (trc.studPattern) form.trailerStudPattern = trc.studPattern
    if (trc.tarpSystem) form.trailerTarp = trc.tarpSystem
    form.trailerPbs = cfg.pbsRating || trc.pbsRating || ''

    // Engineering details (truck)
    form.chassisMake = tc.chassisMake || ''
    form.chassisModel = tc.chassisModel || ''
    form.chassisVariant = tc.chassisVariant || ''
    form.truckBodyLength = tc.bodyLength || ''
    form.truckBodyHeight = tc.bodyHeight || ''
    form.truckGvm = tc.gvm || ''
    form.truckTare = tc.tare || ''
    form.truckSubframeColour = tc.subframeColour || tc.paintColour || ''
    form.truckBodyColour = tc.bodyColour || ''
    form.truckPivotCentre = tc.pivotCentre || '235'
    form.truckTarpLength = tc.tarpLength || ''
    form.truckTarpColour = tc.tarpColour || ''
    form.truckSerial = tc.serial || ''
    form.truckVin = tc.vin || ''
    form.truckMainRunnerWidth = tc.mainRunnerWidth || ''
    form.truckTailgateType = tc.tailgateType || 'Single Drop'
    form.truckTailgateLights = tc.tailgateLights || 'None'
    form.truckTailLights = tc.tailLights || 'Use existing OEM tail lights'
    form.truckSideLights = tc.sideLights || 'None'
    form.truckSideLightsCustom = tc.sideLightsCustom || ''
    form.truckIndicators = tc.indicators || 'None'
    form.truckAntiSpray = tc.antiSpray || 'No'
    form.truckShovelHolder = tc.shovelHolder || 'No'
    form.truckMudflaps = tc.mudflaps || 'None'
    form.truckGrainDoors = tc.grainDoors || 'No'
    form.truckGrainLocks = tc.grainLocks || 'No'
    form.truckReverseBuzzer = tc.reverseBuzzer || 'None'
    form.truckBodySpigot = tc.bodySpigot || 'No'
    form.truckRockSheet = tc.rockSheet || 'No'
    form.truckLiner = tc.liner || 'No'
    form.truckPto = tc.pto || 'None'
    form.truckPump = tc.pump || 'None'
    form.truckHydTankType = tc.hydTankType || 'Factory supplied'
    form.truckHydTankLocation = tc.hydTankLocation || 'Centre Front of Subframe'
    form.truckHoseBurstValve = tc.hoseBurstValve || 'No'
    form.truckChassisExtension = tc.chassisExtension || 'No'
    form.truckBrakeCoupling = tc.brakeCoupling || 'Duomatic'
    form.truckLadderType = tc.ladderType || '3-Step Pull out ladder c/w rungs'
    form.truckLadderPosition = tc.ladderPosition || 'Driverside Front'
    form.truckSpreaderChain = tc.spreaderChain || 'No'
    form.truckPushLugs = tc.pushLugs || 'No'
    form.truckCatMarkers = tc.catMarkers || 'Yes'
    form.truckReflectors = tc.reflectors || ''
    form.truckCamera = tc.camera || 'No'
    form.truckVibrator = tc.vibrator || 'No'
    form.truckDValue = tc.dValue || ''
    form.truckCouplingLoad = tc.couplingLoad || getCouplingLoad(form.truckCoupling)
    // Engineering details (trailer)
    form.trailerBodyLength = trc.bodyLength || ''
    form.trailerBodyHeight = trc.bodyHeight || ''
    form.trailerGtm = trc.gtm || ''
    form.trailerGcm = trc.gcm || ''
    form.trailerTare = trc.tare || ''
    form.trailerChassisColour = trc.chassisColour || trc.paintColour || ''
    form.trailerBodyColour = trc.bodyColour || ''
    form.trailerSerial = trc.serial || ''
    form.trailerVin = trc.vin || ''
    form.trailerFloorSheet = trc.floorSheet || ''
    form.trailerSideSheet = trc.sideSheet || ''
    form.trailerHoist = trc.hoist || ''
    form.trailerPivotCentre = trc.pivotCentre || getTrailerPivotCentre(trc.bodyLength || '')
    form.trailerDrawbarLength = trc.drawbarLength || ''
    form.trailerDrawbarTape = trc.drawbarTape || 'No'
    form.trailerDrawbarCoupling = trc.drawbarCoupling || 'To suit V.Orlandi'
    form.trailerAndersonPlug = trc.andersonPlug || 'Yes'
    form.trailerWheelCarrier = trc.wheelCarrier || 'No'
    form.trailerDropDownLeg = trc.dropDownLeg || 'Drop Down'
    form.trailerPogoStick = trc.pogoStick || 'No'
    form.trailerMainRunnerWidth = trc.mainRunnerWidth || ''
    form.trailerChassisLength = trc.chassisLength || getChassisLength(trc.bodyLength || '')
    form.trailerWheelbase = trc.wheelbase || ''
    form.trailerTailgateType = trc.tailgateType || 'Single Drop'
    form.trailerTailgateLights = trc.tailgateLights || 'None'
    form.trailerTailLights = trc.tailLights && trc.tailLights !== 'Use existing OEM tail lights' ? trc.tailLights : '4 hole round LEDs c/w chrome surround'
    form.trailerLockFlap = trc.lockFlap || 'No'
    form.trailerAxleLift = trc.axleLift || 'No'
    form.trailerAxleLiftAxle = trc.axleLiftAxle || ''
    form.trailerHubodometer = 'Yes'
    form.trailerHubodoLocation = trc.hubodoLocation || ''
    form.trailerHubodoAxle = trc.hubodoAxle || ''
    form.trailerHoseBurstValve = 'Yes'
    form.trailerTyre = trc.tyre || ''
    form.trailerInnerWheels = trc.innerWheels || ''
    form.trailerOuterWheels = trc.outerWheels || ''
    form.trailerTarpColour = trc.tarpColour || ''
    form.trailerTarpMaterial = trc.tarpMaterial || 'PVC'
    form.trailerTarpType = trc.tarpType || 'Hoop Type'
    form.trailerTarpLocation = trc.tarpLocation || 'Standard Out Front'
    form.trailerTarpLength = trc.tarpLength || ''
    form.trailerSideLights = trc.sideLights || 'None'
    form.trailerSideLightsCustom = trc.sideLightsCustom || ''
    form.trailerIndicators = trc.indicators || 'None'
    form.trailerGrainDoors = trc.grainDoors || 'No'
    form.trailerGrainLocks = trc.grainLocks || 'No'
    form.trailerAntiSpray = trc.antiSpray || 'No'
    form.trailerRockSheet = trc.rockSheet || 'No'
    form.trailerLiner = trc.liner || 'No'
    form.trailerRearLadder = trc.rearLadder || 'No'
    form.trailerCentreChain = trc.centreChain || 'No'
    form.trailerCatMarkers = trc.catMarkers || 'No'
    form.trailerReflectors = 'Yes (Amber)'
    form.trailerCamera = trc.camera || 'No'
    form.trailerVibrator = trc.vibrator || 'No'
    form.specialRequirements = cfg.specialRequirements || ''
    // Line items from quick-quote
    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      const truckPrice = Number(tc.price || 0)
      const trailerPrice = Number(trc.price || 0)
      form.lineItems = truckPrice > 0 && trailerPrice > 0 ? [
        { section: 'Truck Body', description: `${template.name} — Truck Body`, quantity: 1, unitPrice: truckPrice, totalPrice: truckPrice, sortOrder: 0 },
        { section: 'Trailer', description: `${template.name} — Dog Trailer`, quantity: 1, unitPrice: trailerPrice, totalPrice: trailerPrice, sortOrder: 1 },
      ] : [
        { section: 'Build', description: template.name, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 },
      ]
    }
  } else if (form.buildType === 'truck-body') {
    if (cfg.material) form.truckMaterial = cfg.material
    if (cfg.mountType) form.truckMountType = cfg.mountType
    if (cfg.hoist) form.truckHoist = cfg.hoist
    if (cfg.tarpSystem) form.truckTarp = cfg.tarpSystem
    if (cfg.coupling) form.truckCoupling = cfg.coupling
    if (cfg.controls) form.truckControls = cfg.controls
    if (cfg.hydraulics) form.truckHydraulics = cfg.hydraulics
    const ts = defaultSheets(form.truckMaterial)
    form.truckFloorSheet = cfg.floorSheet || ts.floor
    form.truckSideSheet = cfg.sideSheet || ts.side

    form.chassisMake = cfg.chassisMake || ''
    form.chassisModel = cfg.chassisModel || ''
    form.chassisVariant = cfg.chassisVariant || ''
    form.truckBodyLength = cfg.bodyLength || ''
    form.truckBodyHeight = cfg.bodyHeight || ''
    form.truckGvm = cfg.gvm || ''
    form.truckTare = cfg.tare || ''
    form.truckSubframeColour = (cfg.subframeColour as string) || (cfg.paintColour as string) || ''
    form.truckBodyColour = (cfg.bodyColour as string) || ''
    form.truckPivotCentre = cfg.pivotCentre || '235'
    form.truckSerial = cfg.serial || ''
    form.truckVin = cfg.vin || ''
    form.truckMainRunnerWidth = cfg.mainRunnerWidth || ''
    form.truckTailgateType = cfg.tailgateType || 'Single Drop'
    form.truckTailgateLights = cfg.tailgateLights || 'None'
    form.truckTailLights = cfg.tailLights || 'Use existing OEM tail lights'
    form.truckSideLights = cfg.sideLights || 'None'
    form.truckSideLightsCustom = (cfg.sideLightsCustom as string) || ''
    form.truckIndicators = (cfg.indicators as string) || 'None'
    form.truckAntiSpray = cfg.antiSpray || 'No'
    form.truckShovelHolder = cfg.shovelHolder || 'No'
    form.truckMudflaps = cfg.mudflaps || 'None'
    form.truckGrainDoors = cfg.grainDoors || 'No'
    form.truckGrainLocks = cfg.grainLocks || 'No'
    form.truckReverseBuzzer = cfg.reverseBuzzer || 'None'
    form.truckBodySpigot = cfg.bodySpigot || 'No'
    form.truckRockSheet = (cfg.rockSheet as string) || 'No'
    form.truckLiner = (cfg.liner as string) || 'No'
    form.truckPto = cfg.pto || 'None'
    form.truckPump = (cfg.pump as string) || 'None'
    form.truckHydTankType = cfg.hydTankType || 'Factory supplied'
    form.truckHydTankLocation = cfg.hydTankLocation || 'Centre Front of Subframe'
    form.truckHoseBurstValve = (cfg.hoseBurstValve as string) || 'No'
    form.truckChassisExtension = (cfg.chassisExtension as string) || 'No'
    form.truckBrakeCoupling = (cfg.brakeCoupling as string) || 'Duomatic'
    form.truckLadderType = (cfg.ladderType as string) || '3-Step Pull out ladder c/w rungs'
    form.truckLadderPosition = (cfg.ladderPosition as string) || 'Driverside Front'
    form.truckSpreaderChain = (cfg.spreaderChain as string) || 'No'
    form.truckPushLugs = (cfg.pushLugs as string) || 'No'
    form.truckCatMarkers = (cfg.catMarkers as string) || 'Yes'
    form.truckReflectors = (cfg.reflectors as string) || ''
    form.truckCamera = (cfg.camera as string) || 'No'
    form.truckVibrator = (cfg.vibrator as string) || 'No'
    form.truckDValue = cfg.dValue || ''
    form.truckCouplingLoad = cfg.couplingLoad || getCouplingLoad(form.truckCoupling)
    form.truckTarpLength = (cfg.tarpLength as string) || ''
    form.truckTarpColour = (cfg.tarpColour as string) || ''
    form.specialRequirements = cfg.specialRequirements || ''
    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      form.lineItems = [{ section: 'Build', description: template.name, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 }]
    }
  } else if (form.buildType === 'trailer') {
    if (cfg.trailerModel) form.trailerModel = cfg.trailerModel
    if (cfg.trailerType) form.trailerType = cfg.trailerType
    if (cfg.material) form.trailerMaterial = cfg.material
    if (cfg.axleMake) form.trailerAxleMake = cfg.axleMake
    if (cfg.axleCount) form.trailerAxleCount = Number(cfg.axleCount)
    if (cfg.axleType) form.trailerAxleType = cfg.axleType
    if (cfg.suspension) {
      const rawSusp = cfg.suspension as string
      form.trailerSuspension = rawSusp.toLowerCase().includes('mechanical') || rawSusp.toLowerCase().includes('rubber') ? 'Mechanical' : 'Air'
    }
    if (cfg.studPattern) form.trailerStudPattern = cfg.studPattern
    if (cfg.tarpSystem) form.trailerTarp = cfg.tarpSystem
    form.trailerPbs = cfg.pbsRating || ''
    form.trailerBodyLength = cfg.bodyLength || ''
    form.trailerBodyHeight = cfg.bodyHeight || ''
    form.trailerGtm = cfg.gtm || ''
    form.trailerGcm = cfg.gcm || ''
    form.trailerTare = cfg.tare || ''
    form.trailerChassisColour = cfg.chassisColour || (cfg.paintColour as string) || ''
    form.trailerBodyColour = cfg.bodyColour || ''
    form.trailerSerial = cfg.serial || ''
    form.trailerVin = cfg.vin || ''
    form.trailerFloorSheet = cfg.floorSheet || ''
    form.trailerSideSheet = cfg.sideSheet || ''
    form.trailerHoist = cfg.hoist || ''
    form.trailerPivotCentre = (cfg.pivotCentre as string) || getTrailerPivotCentre(cfg.bodyLength as string || '')
    form.trailerDrawbarLength = cfg.drawbarLength || ''
    form.trailerDrawbarTape = cfg.drawbarTape || 'No'
    form.trailerDrawbarCoupling = cfg.drawbarCoupling || 'To suit V.Orlandi'
    form.trailerAndersonPlug = cfg.andersonPlug || 'Yes'
    form.trailerWheelCarrier = cfg.wheelCarrier || 'No'
    form.trailerDropDownLeg = cfg.dropDownLeg || 'Drop Down'
    form.trailerPogoStick = cfg.pogoStick || 'No'
    form.trailerMainRunnerWidth = cfg.mainRunnerWidth || ''
    form.trailerChassisLength = cfg.chassisLength || getChassisLength(cfg.bodyLength || '')
    form.trailerWheelbase = cfg.wheelbase || ''
    form.trailerTailgateType = cfg.tailgateType || 'Single Drop'
    form.trailerTailgateLights = cfg.tailgateLights || 'None'
    form.trailerTailLights = cfg.tailLights && cfg.tailLights !== 'Use existing OEM tail lights' ? cfg.tailLights : '4 hole round LEDs c/w chrome surround'
    form.trailerLockFlap = cfg.lockFlap || 'No'
    form.trailerAxleLift = cfg.axleLift || 'No'
    form.trailerAxleLiftAxle = cfg.axleLiftAxle || ''
    form.trailerHubodometer = 'Yes'
    form.trailerHubodoLocation = cfg.hubodoLocation || ''
    form.trailerHubodoAxle = cfg.hubodoAxle || ''
    form.trailerHoseBurstValve = 'Yes'
    form.trailerTyre = cfg.tyre || ''
    form.trailerInnerWheels = cfg.innerWheels || ''
    form.trailerOuterWheels = cfg.outerWheels || ''
    form.trailerTarpColour = cfg.tarpColour || ''
    form.trailerTarpMaterial = cfg.tarpMaterial || 'PVC'
    form.trailerTarpType = cfg.tarpType || 'Hoop Type'
    form.trailerTarpLocation = cfg.tarpLocation || 'Standard Out Front'
    form.trailerTarpLength = cfg.tarpLength || ''
    form.trailerSideLights = cfg.sideLights || 'None'
    form.trailerSideLightsCustom = cfg.sideLightsCustom || ''
    form.trailerIndicators = cfg.indicators || 'None'
    form.trailerGrainDoors = cfg.grainDoors || 'No'
    form.trailerGrainLocks = cfg.grainLocks || 'No'
    form.trailerAntiSpray = cfg.antiSpray || 'No'
    form.trailerRockSheet = cfg.rockSheet || 'No'
    form.trailerLiner = cfg.liner || 'No'
    form.trailerRearLadder = cfg.rearLadder || 'No'
    form.trailerCentreChain = cfg.centreChain || 'No'
    form.trailerCatMarkers = cfg.catMarkers || 'No'
    form.trailerReflectors = 'Yes (Amber)'
    form.trailerCamera = cfg.camera || 'No'
    form.trailerVibrator = cfg.vibrator || 'No'
    form.specialRequirements = cfg.specialRequirements || ''

    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      form.lineItems = [{ section: 'Build', description: template.name, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 }]
    }
  } else if (form.buildType === 'beavertail') {
    form.btDeckWidth = cfg.btDeckWidth || '2470'
    form.btDeckLength = cfg.btDeckLength || '8500'
    form.btFlatDeckLength = cfg.btFlatDeckLength || '7000'
    form.btTailLength = cfg.btTailLength || '1200'
    form.btTailAngle = cfg.btTailAngle || '15'
    form.btRampExtension = cfg.btRampExtension || '300'
    form.btRampType = cfg.btRampType || 'Twin Ramps'
    form.btRampWidth = cfg.btRampWidth || '800'
    form.btRampActualLength = cfg.btRampActualLength || '2700'
    form.btRampCapacity = cfg.btRampCapacity || '12T'
    form.btFloorPlate = cfg.btFloorPlate || '5mm checkered plate'
    form.btCrossMembers = cfg.btCrossMembers || '400mm'
    form.btHydraulics = cfg.btHydraulics || 'Hydraulic Power pack 3000 PSI, double controls with push button hand control and key switch isolator'
    form.btStabiliserLegs = cfg.btStabiliserLegs || '2 x stabilising legs rated at 10T'
    form.btChainPoints = cfg.btChainPoints || '4 x key chain points per side'
    form.btToolbox = cfg.btToolbox || '900 x 450 x 450'
    form.btShovelRacks = cfg.btShovelRacks || '2 x shovel racks to headboard behind cabin'
    form.btLights = cfg.btLights || 'Jumbo LED tail lights and side marker lamps'
    form.btPaint = cfg.btPaint || 'Etch primed and painted with PPG 2pack systems. Colour match to cab.'
    form.btEngineeringNote = cfg.btEngineeringNote || 'subject to final engineering and approval'
    form.chassisMake = cfg.chassisMake || ''
    form.chassisModel = cfg.chassisModel || ''
    form.chassisVariant = cfg.chassisVariant || ''
    form.specialRequirements = cfg.specialRequirements || ''
    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      const spec = buildBeavertailSpec(form)
      form.lineItems = [
        { section: 'Beavertail', description: spec, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 },
        { section: 'Chassis Mods', description: 'Rear Chassis Modifications', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: 1 },
      ]
    }
  } else if (form.buildType === 'tag-trailer') {
    form.btDeckWidth = cfg.btDeckWidth || cfg.deckWidth || '2480'
    form.btDeckLength = cfg.btDeckLength || '9000'
    form.btFlatDeckLength = cfg.btFlatDeckLength || cfg.flatDeckLength || '8000'
    form.btTailLength = cfg.btTailLength || cfg.beavertailLength || '1000'
    form.btTailAngle = cfg.btTailAngle || '12'
    form.btRampExtension = cfg.btRampExtension || '0'
    form.btRampType = cfg.btRampType || cfg.rampType || 'Twin Hydraulic Ramps'
    form.btRampWidth = cfg.btRampWidth || cfg.rampWidth || '900'
    form.btRampActualLength = cfg.btRampActualLength || cfg.rampLength || '2800'
    form.btRampCapacity = cfg.btRampCapacity || '12T'
    form.btFloorPlate = cfg.btFloorPlate || cfg.floor || '5mm checkered plate'
    form.btCrossMembers = cfg.btCrossMembers || 'Heavy gauge'
    form.btHydraulics = cfg.btHydraulics || cfg.hydraulics || 'Powerpack with Redarc Battery Charging System (batteries hidden), Anderson plug and associated wiring'
    form.btStabiliserLegs = cfg.btStabiliserLegs || cfg.drawbarLeg || 'Hydraulic drawbar landing leg'
    form.btChainPoints = cfg.btChainPoints || cfg.chainPoints || '8 x in-floor tie down/chain points'
    form.btToolbox = cfg.btToolbox || cfg.hammerWell || '2000 x 750 x 450 (hammer well)'
    form.btShovelRacks = cfg.btShovelRacks || ''
    form.btLights = cfg.btLights || cfg.lighting || 'Approx 9 x Hella LED side lights, Jumbo rear LED tail lights'
    form.btPaint = cfg.btPaint || cfg.paint || 'Sandblast frame, PPG 2K paint systems — colour match to cab'
    form.btEngineeringNote = cfg.btEngineeringNote || 'Subject to final customer request, engineering and design approvals'
    form.trailerAxleMake = cfg.axleMake || cfg.trailerAxleMake || 'SAF'
    form.trailerAxleCount = cfg.axleCount || cfg.trailerAxleCount || 3
    form.trailerAxleType = cfg.axleType || cfg.trailerAxleType || 'Disc brakes'
    form.trailerSuspension = cfg.suspension || cfg.trailerSuspension || 'Air'
    form.trailerPbs = cfg.pbsRating || form.trailerPbs || ''
    form.chassisMake = cfg.chassisMake || ''
    form.chassisModel = cfg.chassisModel || ''
    form.chassisVariant = cfg.chassisVariant || ''
    form.specialRequirements = cfg.specialRequirements || ''
    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      const spec = buildTagTrailerSpec(form)
      form.lineItems = [
        { section: 'Tag Trailer', description: spec, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 },
        { section: 'Chassis Mods', description: 'Drawbar and coupling fitment', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: 1 },
      ]
    }
  } else if (form.buildType === 'repairs') {
    form.repairDescription = cfg.repairDescription || ''
    form.repairUnit = cfg.repairUnit || ''
    form.repairWarranty = cfg.repairWarranty || false
    form.repairOriginalJob = cfg.repairOriginalJob || ''
    form.specialRequirements = cfg.specialRequirements || ''
  }
}

function buildConfiguration(form: QuoteForm): Record<string, unknown> {
  const cfg: Record<string, unknown> = { buildType: form.buildType }
  const truckData = {
    material: form.truckMaterial, mountType: form.truckMountType,
    floorSheet: form.truckFloorSheet, sideSheet: form.truckSideSheet,
    hoist: form.truckHoist,
    tarpSystem: (form.truckTarpMaterial !== 'None' && form.truckTarpStyle !== 'None')
      ? `${form.truckTarpMaterial} ${form.truckTarpStyle}`
      : 'None', coupling: form.truckCoupling,
    controls: form.truckControls, hydraulics: form.truckHydraulics,
    chassisMake: form.chassisMake, chassisModel: form.chassisModel, chassisVariant: form.chassisVariant,
    bodyLength: form.truckBodyLength, bodyWidth: calcBodyWidth(form.truckMaterial),
    bodyHeight: form.truckBodyHeight, bodyCapacity: calcBodyCapacity(form.truckBodyLength, form.truckMaterial, form.truckBodyHeight, 'truck', form.truckMountType),
    gvm: form.truckGvm, tare: form.truckTare, subframeColour: form.truckSubframeColour, bodyColour: form.truckBodyColour,
    serial: form.truckSerial, vin: form.truckVin,
    mainRunnerWidth: form.truckMainRunnerWidth,
    tailgateType: form.truckTailgateType, tailgateLights: form.truckTailgateLights, tailLights: form.truckTailLights,
    sideLights: form.truckSideLights, sideLightsCustom: form.truckSideLightsCustom, indicators: form.truckIndicators, antiSpray: form.truckAntiSpray, shovelHolder: form.truckShovelHolder, mudflaps: form.truckMudflaps,
    grainDoors: form.truckGrainDoors, grainLocks: form.truckGrainLocks, reverseBuzzer: form.truckReverseBuzzer,
    bodySpigot: form.truckBodySpigot, rockSheet: form.truckRockSheet, liner: form.truckLiner,
    brakeCoupling: form.truckBrakeCoupling, ladderType: form.truckLadderType, ladderPosition: form.truckLadderPosition,
    spreaderChain: form.truckSpreaderChain, pushLugs: form.truckPushLugs, catMarkers: form.truckCatMarkers,
    reflectors: form.truckReflectors, camera: form.truckCamera, vibrator: form.truckVibrator,
    pto: form.truckPto, pump: form.truckPump, hydTankType: form.truckHydTankType,
    hydTankLocation: form.truckHydTankLocation,
    dValue: form.truckDValue, couplingLoad: form.truckCouplingLoad,
    pivotCentre: form.truckPivotCentre,
    tarpLength: form.truckTarpLength,
    tarpColour: form.truckTarpColour,
    tarpBowSize: calcTarpBowHeight(form.truckMaterial, false, form.truckBodyLength, form.truckBodyHeight),
    hoseBurstValve: form.truckHoseBurstValve,
    chassisExtension: form.truckChassisExtension,
  }
  const trailerData = {
    trailerModel: form.trailerModel, trailerType: form.trailerType,
    material: form.trailerMaterial, axleMake: form.trailerAxleMake,
    axleCount: form.trailerAxleCount, axleType: form.trailerAxleType,
    suspension: form.trailerSuspension, studPattern: form.trailerStudPattern,
    tarpSystem: form.trailerTarp,
    pbsRating: form.trailerPbs,
    floorSheet: form.trailerFloorSheet, sideSheet: form.trailerSideSheet,
    hoist: form.trailerHoist, pivotCentre: form.trailerPivotCentre, drawbarLength: form.trailerDrawbarLength,
    drawbarTape: form.trailerDrawbarTape, drawbarCoupling: form.trailerDrawbarCoupling,
    andersonPlug: form.trailerAndersonPlug, wheelCarrier: form.trailerWheelCarrier,
    dropDownLeg: form.trailerDropDownLeg, pogoStick: form.trailerPogoStick,
    bodyLength: form.trailerBodyLength, bodyWidth: calcBodyWidth(form.trailerMaterial),
    bodyHeight: form.trailerBodyHeight, bodyCapacity: calcBodyCapacity(form.trailerBodyLength, form.trailerMaterial, form.trailerBodyHeight, 'trailer'),
    gtm: form.trailerGtm, gcm: form.trailerGcm,
    tare: form.trailerTare, chassisColour: form.trailerChassisColour, bodyColour: form.trailerBodyColour,
    serial: form.trailerSerial, vin: form.trailerVin,
    mainRunnerWidth: form.trailerMainRunnerWidth,
    chassisLength: form.trailerChassisLength, wheelbase: form.trailerWheelbase,
    tailgateType: form.trailerTailgateType, tailgateLights: form.trailerTailgateLights, tailLights: form.trailerTailLights, lockFlap: form.trailerLockFlap,
    axleLift: form.trailerAxleLift, axleLiftAxle: form.trailerAxleLiftAxle,
    hubodometer: form.trailerHubodometer, hubodoLocation: form.trailerHubodoLocation, hubodoAxle: form.trailerHubodoAxle,
    hoseBurstValve: form.trailerHoseBurstValve,
    tyre: form.trailerTyre, innerWheels: form.trailerInnerWheels, outerWheels: form.trailerOuterWheels,
    tarpColour: form.trailerTarpColour, tarpMaterial: form.trailerTarpMaterial,
    tarpType: form.trailerTarpType, tarpLocation: form.trailerTarpLocation, tarpLength: form.trailerTarpLength,
    sideLights: form.trailerSideLights, sideLightsCustom: form.trailerSideLightsCustom, indicators: form.trailerIndicators,
    grainDoors: form.trailerGrainDoors, grainLocks: form.trailerGrainLocks,
    antiSpray: form.trailerAntiSpray, rockSheet: form.trailerRockSheet, liner: form.trailerLiner,
    rearLadder: form.trailerRearLadder, centreChain: form.trailerCentreChain,
    catMarkers: form.trailerCatMarkers, reflectors: form.trailerReflectors,
    camera: form.trailerCamera, vibrator: form.trailerVibrator,
    tarpBowSize: calcTarpBowHeight(form.trailerMaterial, form.trailerModel.startsWith('DT-'), form.trailerBodyLength, form.trailerBodyHeight),
    axleSettings: getAxleSettings(form.trailerAxleMake, form.trailerAxleType, form.trailerAxleCount),
  }
  if (form.buildType === 'truck-and-trailer') {
    cfg.truckConfig = truckData
    cfg.trailerConfig = trailerData
    cfg.pbsRating = form.trailerPbs
    cfg.specialRequirements = form.specialRequirements
  } else if (form.buildType === 'truck-body') {
    Object.assign(cfg, truckData)
    cfg.specialRequirements = form.specialRequirements
  } else if (form.buildType === 'beavertail') {
    cfg.btDeckWidth = form.btDeckWidth
    cfg.btDeckLength = form.btDeckLength
    cfg.btFlatDeckLength = form.btFlatDeckLength
    cfg.btTailLength = form.btTailLength
    cfg.btTailAngle = form.btTailAngle
    cfg.btRampExtension = form.btRampExtension
    cfg.btRampType = form.btRampType
    cfg.btRampWidth = form.btRampWidth
    cfg.btRampActualLength = form.btRampActualLength
    cfg.btRampCapacity = form.btRampCapacity
    cfg.btFloorPlate = form.btFloorPlate
    cfg.btCrossMembers = form.btCrossMembers
    cfg.btHydraulics = form.btHydraulics
    cfg.btStabiliserLegs = form.btStabiliserLegs
    cfg.btChainPoints = form.btChainPoints
    cfg.btToolbox = form.btToolbox
    cfg.btShovelRacks = form.btShovelRacks
    cfg.btLights = form.btLights
    cfg.btPaint = form.btPaint
    cfg.btEngineeringNote = form.btEngineeringNote
    cfg.chassisMake = form.chassisMake
    cfg.chassisModel = form.chassisModel
    cfg.chassisVariant = form.chassisVariant
    cfg.specialRequirements = form.specialRequirements
  } else if (form.buildType === 'tag-trailer') {
    cfg.btDeckWidth = form.btDeckWidth
    cfg.btDeckLength = form.btDeckLength
    cfg.btFlatDeckLength = form.btFlatDeckLength
    cfg.btTailLength = form.btTailLength
    cfg.btTailAngle = form.btTailAngle
    cfg.btRampExtension = form.btRampExtension
    cfg.btRampType = form.btRampType
    cfg.btRampWidth = form.btRampWidth
    cfg.btRampActualLength = form.btRampActualLength
    cfg.btRampCapacity = form.btRampCapacity
    cfg.btFloorPlate = form.btFloorPlate
    cfg.btCrossMembers = form.btCrossMembers
    cfg.btHydraulics = form.btHydraulics
    cfg.btStabiliserLegs = form.btStabiliserLegs
    cfg.btChainPoints = form.btChainPoints
    cfg.btToolbox = form.btToolbox
    cfg.btShovelRacks = form.btShovelRacks
    cfg.btLights = form.btLights
    cfg.btPaint = form.btPaint
    cfg.btEngineeringNote = form.btEngineeringNote
    cfg.trailerAxleMake = form.trailerAxleMake
    cfg.trailerAxleCount = form.trailerAxleCount
    cfg.trailerAxleType = form.trailerAxleType
    cfg.trailerSuspension = form.trailerSuspension
    cfg.trailerStudPattern = form.trailerStudPattern
    cfg.pbsRating = form.trailerPbs
    cfg.chassisMake = form.chassisMake
    cfg.chassisModel = form.chassisModel
    cfg.chassisVariant = form.chassisVariant
    cfg.specialRequirements = form.specialRequirements
  } else if (form.buildType === 'repairs') {
    cfg.repairDescription = form.repairDescription
    cfg.repairUnit = form.repairUnit
    cfg.repairWarranty = form.repairWarranty
    cfg.repairOriginalJob = form.repairOriginalJob
    cfg.specialRequirements = form.specialRequirements
  } else {
    Object.assign(cfg, trailerData)
    cfg.specialRequirements = form.specialRequirements
  }
  return cfg
}

// ─── Main builder component ───────────────────────────────────────────────────

function QuoteBuilderInner() {
  const router = useRouter()
  const params = useSearchParams()
  const quoteId = params.get('id')
  const templateId = params.get('templateId')
  const buildTypeParam = params.get('buildType')
  const { data: session } = useSession()

  const [form, setForm] = useState<QuoteForm>(emptyForm())
  const [savedId, setSavedId] = useState<string | null>(quoteId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptModal, setAcceptModal] = useState(false)
  const [acceptMode, setAcceptMode] = useState<'new' | 'existing'>('new')
  const [existingJobNum, setExistingJobNum] = useState('')
  const [newJobNum, setNewJobNum] = useState('')
  const [previewVin, setPreviewVin] = useState('')
  const [acceptResult, setAcceptResult] = useState<{ jobNum: string; jobId: string; isExisting?: boolean; pairedJobNum?: string; pairedJobId?: string } | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isQuickQuote, setIsQuickQuote] = useState(false)
  const [declineModal, setDeclineModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [specWarning, setSpecWarning] = useState<string | null>(null)
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [dealerSuggestions, setDealerSuggestions] = useState<string[]>([])
  const [bomList, setBomList] = useState<{ code: string; name: string; section: string }[]>([])
  const [bomLoading, setBomLoading] = useState(false)
  const [linkedJobNum, setLinkedJobNum] = useState('')

  useEffect(() => {
    fetch('/api/quotes?limit=500')
      .then((r) => r.json())
      .then((data) => {
        const quotes: { customerName?: string; dealerName?: string }[] = Array.isArray(data) ? data : []
        const customers = Array.from(new Set(quotes.map((q) => q.customerName).filter(Boolean))) as string[]
        const dealers = Array.from(new Set(quotes.map((q) => q.dealerName).filter(Boolean))) as string[]
        setCustomerSuggestions(customers.sort())
        setDealerSuggestions(dealers.sort())
      })
      .catch(() => {})
  }, [])

  // Load quote number, template, or existing quote
  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        if (quoteId) {
          // Load existing quote
          const res = await fetch(`/api/quotes/${quoteId}`)
          const quote = await res.json()
          const f = emptyForm(quote.quoteNumber)
          f.status = quote.status
          f.customerName = quote.customerName
          f.dealerName = quote.dealerName
          f.contactName = quote.contactName
          f.contactEmail = quote.contactEmail
          f.contactPhone = quote.contactPhone
          f.preparedBy = quote.preparedBy
          f.salesPerson = quote.salesPerson
          f.validDays = quote.validDays
          f.margin = quote.margin
          f.overhead = quote.overhead
          f.discount = quote.discount
          f.notes = quote.notes
          f.terms = quote.terms
          f.declineReason = quote.declineReason || ''
          f.useOverride = !!quote.overridePrice
          f.overridePrice = quote.overridePrice ? String(quote.overridePrice) : ''
          f.overrideNote = quote.overrideNote || ''
          f.jobId = quote.jobId || ''
          f.lineItems = (quote.lineItems || []).map((li: any) => ({
            ...li,
            quantity:   Number.isFinite(Number(li.quantity))   ? Number(li.quantity)   : 1,
            unitPrice:  Number.isFinite(Number(li.unitPrice))  ? Number(li.unitPrice)  : 0,
            totalPrice: Number.isFinite(Number(li.totalPrice)) ? Number(li.totalPrice) : 0,
          }))
          if (quote.jobId) {
            fetch(`/api/jobs/${quote.jobId}`)
              .then((r) => r.json())
              .then((j) => {
                if (!j?.num) return
                if (j.pairedId) {
                  fetch(`/api/jobs/${j.pairedId}`)
                    .then((r) => r.json())
                    .then((p) => setLinkedJobNum(p?.num ? `${j.num} + ${p.num}` : j.num))
                    .catch(() => setLinkedJobNum(j.num))
                } else {
                  setLinkedJobNum(j.num)
                }
              })
              .catch(() => {})
          }
          const cfg = quote.configuration as Record<string, any>
          applyTemplateConfig(f, cfg)
          setIsQuickQuote(cfg.templateType === 'quick-quote')
          setForm(f)
        } else {
          // New quote — get next number
          const numRes = await fetch('/api/quotes/next-number')
          const { quoteNumber } = await numRes.json()
          const f = emptyForm(quoteNumber)
          if (session?.user?.name) f.preparedBy = session.user.name

          if (templateId) {
            const tRes = await fetch(`/api/templates/${templateId}`)
            const template = await tRes.json()
            const cfg = template.configuration as Record<string, any>
            applyTemplateConfig(f, cfg, template)
            setIsQuickQuote(cfg.templateType === 'quick-quote')
          } else if (buildTypeParam) {
            f.buildType = buildTypeParam
          }
          setForm(f)
        }
      } catch (e) {
        // silent
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, templateId, buildTypeParam])

  // Auto-set preparedBy from session once loaded
  useEffect(() => {
    if (session?.user?.name && !form.preparedBy) {
      setForm((f) => ({ ...f, preparedBy: session!.user!.name as string }))
    }
  }, [session])

  // Auto-calculate trailer chassis length + pivot centre from body length
  useEffect(() => {
    const chassis = getChassisLength(form.trailerBodyLength)
    const pivot = getTrailerPivotCentre(form.trailerBodyLength)
    setForm((f) => ({
      ...f,
      ...(chassis ? { trailerChassisLength: chassis } : {}),
      ...(pivot ? { trailerPivotCentre: pivot } : {}),
    }))
  }, [form.trailerBodyLength])

  // Auto-set coupling load from coupling selection
  useEffect(() => {
    setForm((f) => ({ ...f, truckCouplingLoad: getCouplingLoad(f.truckCoupling) }))
  }, [form.truckCoupling])

  // Sync body extras → line items
  useEffect(() => {
    setForm(f => {
      const EXTRAS_SECTION = 'Body Extras'
      // Preserve any prices already set for these extras
      const savedPrices: Record<string, { unitPrice: number; totalPrice: number; quantity: number }> = {}
      for (const li of f.lineItems) {
        if (li.section === EXTRAS_SECTION) {
          savedPrices[li.description] = { unitPrice: li.unitPrice, totalPrice: li.totalPrice, quantity: li.quantity }
        }
      }
      // Build active extras list
      const active: string[] = []
      active.push('Underbody access ladder')  // always included on every truck job
      if (f.truckSideLights && f.truckSideLights !== 'None') active.push(f.truckSideLights)
      if (f.truckAntiSpray === 'Yes') active.push('Anti spray suppressant')
      if (f.truckShovelHolder === 'Yes') active.push('Underbody shovel holder')
      if (f.truckMudflaps && f.truckMudflaps !== 'None') active.push(f.truckMudflaps)

      const newExtras: LineItem[] = active.map(desc => {
        const saved = savedPrices[desc]
        return { section: EXTRAS_SECTION, description: desc, quantity: saved?.quantity ?? 1, unitPrice: saved?.unitPrice ?? 0, totalPrice: saved?.totalPrice ?? 0, sortOrder: 0 }
      })
      const nonExtras = f.lineItems.filter(li => li.section !== EXTRAS_SECTION)
      const allItems = [...nonExtras, ...newExtras].map((li, i) => ({ ...li, sortOrder: i }))
      return { ...f, lineItems: allItems }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.truckSideLights, form.truckAntiSpray, form.truckShovelHolder, form.truckMudflaps])

  // Load BOMs when quote is saved
  useEffect(() => {
    if (!savedId) { setBomList([]); return }
    setBomLoading(true)
    fetch(`/api/quotes/${savedId}/boms`)
      .then(r => r.json())
      .then(d => setBomList(Array.isArray(d.resolvedBoms) ? d.resolvedBoms : []))
      .catch(() => setBomList([]))
      .finally(() => setBomLoading(false))
  }, [savedId])

  // ── Field update helpers ──────────────────────────────────────────────────

  const set = useCallback((key: keyof QuoteForm, val: any) => {
    setForm((f) => {
      const updated = { ...f, [key]: val }
      // Auto-cascade: stud pattern change → clear wheels if mismatched
      if (key === 'trailerStudPattern') {
        const pcd = String(val).replace('PCD', '')
        if (f.trailerInnerWheels && !f.trailerInnerWheels.endsWith(`- ${pcd}`)) updated.trailerInnerWheels = ''
        if (f.trailerOuterWheels && !f.trailerOuterWheels.endsWith(`- ${pcd}`)) updated.trailerOuterWheels = ''
      }
      // Auto-cascade: trailer body length → hoist model + tarp length
      if (key === 'trailerBodyLength') {
        const hoist = TRAILER_HOIST_MAP[String(val).trim()]
        if (hoist) updated.trailerHoist = hoist
        const bodyLen = parseInt(String(val), 10)
        if (!isNaN(bodyLen) && bodyLen > 400) updated.trailerTarpLength = String(bodyLen - 400)
      }
      // Auto-cascade: trailer material → floor/side sheet + main runner width + clear body height
      if (key === 'trailerMaterial') {
        const mat = String(val)
        if (mat === 'Aluminium') {
          updated.trailerFloorSheet = '8mm Aluminium'
          updated.trailerSideSheet = '5mm Aluminium'
          updated.trailerMainRunnerWidth = '965'
        } else if (mat.startsWith('Hardox')) {
          updated.trailerFloorSheet = `6mm ${mat}`
          updated.trailerSideSheet = `5mm ${mat}`
          updated.trailerMainRunnerWidth = '945'
        }
        updated.trailerBodyHeight = ''
      }
      // Auto-cascade: trailer model → axle count
      if (key === 'trailerModel') {
        const axleMatch = String(val).match(/\((\d+)-Axle/)
        if (axleMatch) updated.trailerAxleCount = parseInt(axleMatch[1], 10)
      }
      // Auto-cascade: truck body length → hoist + pivot centre + tarp length
      if (key === 'truckBodyLength') {
        const bodyLen = parseInt(val?.toString().trim(), 10)
        const match = TRUCK_BODY_HOIST_MAP[val?.toString().trim()]
        if (match) {
          updated.truckHoist = match.hoist
        }
        // Tarp length = body length - 400mm
        if (!isNaN(bodyLen) && bodyLen > 400) {
          updated.truckTarpLength = String(bodyLen - 400)
        }
      }
      return updated
    })
  }, [])

  function onMaterialChange(material: string) {
    const sheets = defaultSheets(material)
    const isHardox = material.startsWith('Hardox')
    setForm((f) => ({
      ...f,
      truckMaterial: material,
      truckFloorSheet: sheets.floor,
      truckSideSheet: sheets.side,
      truckLadderType: isHardox ? '3-Step Pull out ladder c/w rungs' : f.truckLadderType,
      truckLadderPosition: isHardox ? 'Driverside Front' : f.truckLadderPosition,
    }))
  }

  // ── Line items ────────────────────────────────────────────────────────────

  function addLineItem() {
    setForm((f) => ({
      ...f,
      lineItems: [
        ...f.lineItems,
        { section: 'Build', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: f.lineItems.length },
      ],
    }))
  }

  function addExtra() {
    setForm((f) => ({
      ...f,
      lineItems: [
        ...f.lineItems,
        { section: 'Optional Extras', description: '', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: f.lineItems.length },
      ],
    }))
  }

  function updateLineItem(idx: number, field: keyof LineItem, val: string | number) {
    setForm((f) => {
      const items = f.lineItems.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: val }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice)
        }
        return updated
      })
      return { ...f, lineItems: items }
    })
  }

  function removeLineItem(idx: number) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sortOrder: i })),
    }))
  }

  function handleGenerateSpec() {
    setForm((f) => {
      const hasTrk = f.buildType === 'truck-body' || f.buildType === 'truck-and-trailer'
      const hasTrl = f.buildType === 'trailer'    || f.buildType === 'truck-and-trailer'

      if (f.buildType === 'truck-and-trailer') {
        const trk = f.lineItems.find((i) => /truck/i.test(i.section)) || f.lineItems[0]
        const trl = f.lineItems.find((i) => /trailer/i.test(i.section)) || f.lineItems[1]
        const extras = f.lineItems.filter((i) => i !== trk && i !== trl)
        const newItems: LineItem[] = [
          {
            ...(trk || {}),
            section: trk?.section || 'Truck Body',
            description: generateTruckBodySpec(f),
            quantity: trk?.quantity ?? 1,
            unitPrice: trk?.unitPrice ?? 0,
            totalPrice: trk?.totalPrice ?? 0,
            sortOrder: 0,
          } as LineItem,
          {
            ...(trl || {}),
            section: trl?.section || 'Trailer',
            description: generateTrailerSpec(f),
            quantity: trl?.quantity ?? 1,
            unitPrice: trl?.unitPrice ?? 0,
            totalPrice: trl?.totalPrice ?? 0,
            sortOrder: 1,
          } as LineItem,
          ...extras.map((e, i) => ({ ...e, sortOrder: i + 2 })),
        ]
        return { ...f, lineItems: newItems }
      } else if (hasTrk) {
        const existing = f.lineItems[0]
        const rest = f.lineItems.slice(1)
        const updated: LineItem = {
          ...(existing || {}),
          section: existing?.section || 'Build',
          description: generateTruckBodySpec(f),
          quantity: existing?.quantity ?? 1,
          unitPrice: existing?.unitPrice ?? 0,
          totalPrice: existing?.totalPrice ?? 0,
          sortOrder: 0,
        } as LineItem
        return { ...f, lineItems: [updated, ...rest.map((e, i) => ({ ...e, sortOrder: i + 1 }))] }
      } else if (hasTrl) {
        const existing = f.lineItems[0]
        const rest = f.lineItems.slice(1)
        const updated: LineItem = {
          ...(existing || {}),
          section: existing?.section || 'Build',
          description: generateTrailerSpec(f),
          quantity: existing?.quantity ?? 1,
          unitPrice: existing?.unitPrice ?? 0,
          totalPrice: existing?.totalPrice ?? 0,
          sortOrder: 0,
        } as LineItem
        return { ...f, lineItems: [updated, ...rest.map((e, i) => ({ ...e, sortOrder: i + 1 }))] }
      }
      return f
    })
  }

  // ── Computed pricing ──────────────────────────────────────────────────────

  const subtotal = form.lineItems.reduce((s, i) => s + i.totalPrice, 0)
  const marginAmt = subtotal * (form.margin / 100)
  const calculatedTotal = subtotal + marginAmt + form.overhead - form.discount
  const effectiveTotal = form.useOverride && form.overridePrice ? parseFloat(form.overridePrice) || 0 : calculatedTotal
  // Registration is GST-free — exclude from GST displayed in builder
  const gstFreeItems = form.lineItems.filter((i) => /registration/i.test(i.description))
  const gstFreeAmt = gstFreeItems.reduce((s, i) => s + i.totalPrice, 0)
  const inclGst = effectiveTotal + Math.max(0, effectiveTotal - gstFreeAmt) * 0.1

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave(nextStatus?: string) {
    setSaving(true)
    setSaveError('')

    // BUG-02 / BUG-13: validate before marking as Sent
    if (nextStatus === 'sent') {
      const name = form.customerName.trim().toLowerCase()
      if (!name || name === 'tbc') {
        setSaveError('Customer name is required to mark as Sent — use "Save Draft" to save without sending.')
        setSaving(false)
        return
      }
      if (effectiveTotal === 0 || form.lineItems.length === 0) {
        setSaveError('Quote has no pricing — add line items before marking as Sent. Use "Save Draft" to save without sending.')
        setSaving(false)
        return
      }
    }

    try {
      const cfg = buildConfiguration(form)
      const buildTypeLabel = BUILD_TYPES.find((b) => b.value === form.buildType)?.label.replace(/[^\w\s+]/g, '').trim() || form.buildType
      const payload = {
        quoteNumber: form.quoteNumber,
        status: nextStatus || form.status,
        customerName: form.customerName || 'TBC',
        dealerName: form.dealerName,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        buildType: buildTypeLabel,
        configuration: cfg,
        subtotal,
        margin: form.margin,
        overhead: form.overhead,
        discount: form.discount,
        total: calculatedTotal,
        overridePrice: form.useOverride && form.overridePrice ? parseFloat(form.overridePrice) : null,
        overrideNote: form.overrideNote || null,
        preparedBy: form.preparedBy,
        salesPerson: form.salesPerson,
        validDays: form.validDays,
        notes: form.notes,
        terms: form.terms,
        declineReason: form.declineReason,
        jobId: form.jobId || null,
        lineItems: form.lineItems.map((item, i) => ({
          section: item.section,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          sortOrder: i,
        })),
      }

      let id = savedId
      if (id) {
        const patchRes = await fetch(`/api/quotes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!patchRes.ok) {
          const errBody = await patchRes.json().catch(() => ({}))
          throw new Error(errBody.error || `Save failed (${patchRes.status})`)
        }
      } else {
        const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `Save failed (${res.status})`)
        }
        const created = await res.json()
        id = created.id
        setSavedId(id)
        window.history.replaceState({}, '', `/quotes/builder?id=${id}`)
      }

      if (nextStatus) setForm((f) => ({ ...f, status: nextStatus }))
      // Refresh BOMs after save
      if (id) {
        fetch(`/api/quotes/${id}/boms`)
          .then(r => r.json())
          .then(d => setBomList(Array.isArray(d.resolvedBoms) ? d.resolvedBoms : []))
          .catch(() => {})
      }
    } catch (e: any) {
      setSaveError(e.message || 'Save failed')
    }
    setSaving(false)
  }

  // ── Accept quote ──────────────────────────────────────────────────────────

  async function handleAccept() {
    if (!savedId) return
    setAccepting(true)
    try {
      const body: Record<string, string> = {}
      if (acceptMode === 'existing' && existingJobNum.trim()) {
        body.existingJobNum = existingJobNum.trim()
      } else if (acceptMode === 'new' && newJobNum.trim()) {
        body.customJobNum = newJobNum.trim()
      }
      const res = await fetch(`/api/quotes/${savedId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || 'Accept failed')
      } else {
        setForm((f) => ({ ...f, status: 'accepted', jobId: data.job.id }))
        setLinkedJobNum(data.pairedJob ? `${data.job.num} + ${data.pairedJob.num}` : data.job.num)
        setAcceptResult({
          jobNum: data.job.num,
          jobId: data.job.id,
          isExisting: data.isExisting,
          pairedJobNum: data.pairedJob?.num,
          pairedJobId: data.pairedJob?.id,
        })
      }
    } catch (e: any) {
      setSaveError(e.message || 'Accept failed')
    }
    setAccepting(false)
    setAcceptModal(false)
  }

  async function handleRevise() {
    if (!savedId) return
    try {
      const res = await fetch(`/api/quotes/${savedId}/copy`, { method: 'POST' })
      const data = await res.json()
      if (data.id) router.push(`/quotes/builder?id=${data.id}`)
    } catch {
      setSaveError('Failed to create revision')
    }
  }

  // BUG-04: Delete draft quote
  async function handleDelete() {
    if (!savedId) return
    if (!confirm('Delete this draft quote? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`/api/quotes/${savedId}`, { method: 'DELETE' })
      router.push('/quotes')
    } catch {
      setSaveError('Failed to delete quote')
    }
    setDeleting(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const hasTruck = form.buildType === 'truck-body' || form.buildType === 'truck-and-trailer'
  const hasTrailer = form.buildType === 'trailer' || form.buildType === 'truck-and-trailer'
  const hasBeavertail = form.buildType === 'beavertail'
  const hasTagTrailer = form.buildType === 'tag-trailer'
  const hasRepairs = form.buildType === 'repairs'

  // Derived — computed at render time so they always reflect current inputs
  const truckBodyWidth = calcBodyWidth(form.truckMaterial)
  const trailerBodyWidth = calcBodyWidth(form.trailerMaterial)
  const truckBodyCapacity = calcBodyCapacity(form.truckBodyLength, form.truckMaterial, form.truckBodyHeight, 'truck', form.truckMountType)
  const trailerBodyCapacity = calcBodyCapacity(form.trailerBodyLength, form.trailerMaterial, form.trailerBodyHeight, 'trailer')
  const truckBowHeight = calcTarpBowHeight(form.truckMaterial, false, form.truckBodyLength, form.truckBodyHeight)
  const trailerBowHeight = calcTarpBowHeight(form.trailerMaterial, form.trailerModel.startsWith('DT-'), form.trailerBodyLength, form.trailerBodyHeight)
  const trailerAxleSettings = getAxleSettings(form.trailerAxleMake, form.trailerAxleType, form.trailerAxleCount)

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#000' }}>
      {/* Hide number input spinners globally for this page */}
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#000', flexShrink: 0, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/quotes')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 0 }}
          >
            ← Quotes
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 18, fontWeight: 800, letterSpacing: 1, color: '#fff',
          }}>
            {form.quoteNumber || 'New Quote'}
          </span>
          <StatusBadge status={form.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saveError && <span style={{ fontSize: 12, color: '#f87171' }}>{saveError}</span>}
          {/* BUG-04: Delete draft */}
          {savedId && form.status === 'draft' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...btnStyle('ghost'), color: 'rgba(239,68,68,0.7)', borderColor: 'rgba(239,68,68,0.3)' }}
              title="Delete this draft quote"
            >
              {deleting ? '…' : 'Delete Draft'}
            </button>
          )}
          {savedId && (
            <>
              <button
                onClick={() => window.open(`/qpdf/${savedId}`, '_blank')}
                style={btnStyle('ghost')}
                title="Open printable quote PDF"
              >
                🖨 Quote PDF
              </button>
              <button
                onClick={() => window.open(`/qsheet/${savedId}`, '_blank')}
                style={btnStyle('ghost')}
                title="Open printable job sheet"
              >
                📋 Job Sheet
              </button>
            </>
          )}
          {savedId && (
            <button
              onClick={handleRevise}
              style={btnStyle('ghost')}
              title="Create a revised copy of this quote"
            >
              ↗ Revise
            </button>
          )}
          {savedId && (form.status === 'draft' || form.status === 'sent') && (
            <button
              onClick={async () => {
                setAcceptMode('new')
                setExistingJobNum('')
                setNewJobNum('')
                setPreviewVin('')
                try {
                  const res = await fetch('/api/job-master/next-number')
                  const { jobNumber } = await res.json()
                  setNewJobNum(jobNumber)
                } catch {}
                const isTrailerBuild = ['trailer', 'truck-and-trailer'].includes(form.buildType)
                if (isTrailerBuild) {
                  try {
                    const model = encodeURIComponent(form.trailerModel || 'DT-4 (4-Axle Dog)')
                    const res = await fetch(`/api/quotes/next-trailer-vin?model=${model}`)
                    const { vin } = await res.json()
                    setPreviewVin(vin)
                  } catch {}
                }
                setAcceptModal(true)
              }}
              disabled={saving || accepting}
              style={{ ...btnStyle('secondary'), borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.1)', color: 'rgba(34,197,94,0.9)' }}
            >
              ✓ Accept Quote
            </button>
          )}
          {form.status === 'draft' && (
            <button onClick={() => handleSave('sent')} disabled={saving} style={btnStyle('ghost')}>
              Mark as Sent
            </button>
          )}
          <button onClick={() => handleSave()} disabled={saving} style={btnStyle('primary')}>
            {saving ? 'Saving…' : savedId ? 'Save' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>

        {/* BUG-10: Sent/accepted warning banner */}
        {savedId && (form.status === 'sent' || form.status === 'accepted') && (
          <div style={{
            background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            fontSize: 12, color: '#eab308', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠ This quote has already been <strong>{form.status}</strong>. Saving changes will not automatically notify the customer.
          </div>
        )}

        {/* ── Section: Customer ── */}
        <SectionCard title="Customer Details" icon="👤">
          <div style={grid(4)}>
            <Field label="Quote Number">
              <input value={form.quoteNumber} onChange={(e) => set('quoteNumber', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'declined' && form.status !== 'declined') {
                    setDeclineModal(true)
                  } else {
                    set('status', val)
                  }
                }}
                style={selectStyle}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Valid Days">
              <input type="number" value={form.validDays} onChange={(e) => set('validDays', parseInt(e.target.value) || 30)} style={inputStyle} min={1} max={365} />
            </Field>
            <Field label="Prepared By">
              <input value={form.preparedBy} onChange={(e) => set('preparedBy', e.target.value)} placeholder="e.g. Nathan" style={inputStyle} />
            </Field>
          </div>
          <datalist id="customer-list">
            {customerSuggestions.map((c) => <option key={c} value={c} />)}
          </datalist>
          <datalist id="dealer-list">
            {dealerSuggestions.map((d) => <option key={d} value={d} />)}
          </datalist>
          <div style={{ ...grid(2), marginTop: 16 }}>
            <Field label="Customer Name *">
              <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="e.g. Smith Transport" style={inputStyle} list="customer-list" autoComplete="off" />
            </Field>
            <Field label="Dealer / Source">
              <input value={form.dealerName} onChange={(e) => set('dealerName', e.target.value)} placeholder="e.g. Hino Brisbane" style={inputStyle} list="dealer-list" autoComplete="off" />
            </Field>
          </div>
          <div style={{ ...grid(3), marginTop: 16 }}>
            <Field label="Contact Name">
              <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Contact person" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </Field>
            <Field label="Phone">
              <input value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="04xx xxx xxx" style={inputStyle} />
            </Field>
          </div>
          <div style={{ ...grid(2), marginTop: 16 }}>
            <Field label="Sales Person">
              <input value={form.salesPerson} onChange={(e) => set('salesPerson', e.target.value)} placeholder="e.g. Pete" style={inputStyle} />
            </Field>
            {linkedJobNum && (
              <Field label="Job Number">
                <div style={{ ...inputStyle, background: 'rgba(232,104,26,0.08)', border: '1px solid rgba(232,104,26,0.4)', color: '#E8681A', fontWeight: 700, cursor: 'default' }}>
                  {linkedJobNum}
                </div>
              </Field>
            )}
          </div>
        </SectionCard>

        {/* ── Section: Build Type ── */}
        <SectionCard title="Build Type" icon="🔧" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {BUILD_TYPES.map((bt) => (
              <button
                key={bt.value}
                onClick={() => set('buildType', bt.value)}
                style={{
                  padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: `2px solid ${form.buildType === bt.value ? '#E8681A' : 'rgba(255,255,255,0.12)'}`,
                  background: form.buildType === bt.value ? 'rgba(232,104,26,0.12)' : '#111',
                  color: form.buildType === bt.value ? '#E8681A' : 'rgba(255,255,255,0.55)',
                  transition: 'all 0.15s',
                }}
              >
                {bt.label}
              </button>
            ))}
          </div>
          {isQuickQuote && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(232,104,26,0.08)', border: '1px solid rgba(232,104,26,0.25)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              ⚡ Quick Quote template — pricing pre-loaded. Add line items below for any deviations or extras.
            </div>
          )}
        </SectionCard>

        {/* ── Section: Truck Body Config ── */}
        {hasTruck && (
          <SectionCard
            title={form.buildType === 'truck-and-trailer' ? 'Truck Body Configuration' : 'Body Configuration'}
            icon="🚛"
            style={{ marginTop: 20 }}
          >
            {/* Row 1: Material + mount type + sheets */}
            <div style={grid(4)}>
              <Field label="Body Material">
                <select value={form.truckMaterial} onChange={(e) => onMaterialChange(e.target.value)} style={selectStyle}>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Mount Type">
                <select value={form.truckMountType} onChange={(e) => set('truckMountType', e.target.value)} style={selectStyle}>
                  {MOUNT_TYPES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Floor Sheet">
                <input value={form.truckFloorSheet} onChange={(e) => set('truckFloorSheet', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Side Sheet">
                <input value={form.truckSideSheet} onChange={(e) => set('truckSideSheet', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Row 2: Hoist + couplings + controls + hydraulics */}
            <div style={{ ...grid(4), marginTop: 16 }}>
              <Field label="Hoist">
                <select value={form.truckHoist} onChange={(e) => set('truckHoist', e.target.value)} style={selectStyle}>
                  {HOISTS.map((h) => <option key={h}>{h}</option>)}
                </select>
              </Field>
              <Field label="Push Lugs">
                <select value={form.truckPushLugs} onChange={(e) => set('truckPushLugs', e.target.value)} style={selectStyle}>
                  <option value="">Select...</option>
                  <option>No</option>
                  <option>Yes</option>
                  <option>Yes with Shute between</option>
                </select>
              </Field>
              <Field label="Coupling">
                <select value={form.truckCoupling} onChange={(e) => set('truckCoupling', e.target.value)} style={selectStyle}>
                  {COUPLINGS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Brake Coupling">
                <select value={form.truckBrakeCoupling} onChange={(e) => set('truckBrakeCoupling', e.target.value)} style={selectStyle}>
                  {BRAKE_COUPLINGS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Controls">
                <select value={form.truckControls} onChange={(e) => set('truckControls', e.target.value)} style={selectStyle}>
                  {CONTROLS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Hydraulics">
                <select value={form.truckHydraulics} onChange={(e) => set('truckHydraulics', e.target.value)} style={selectStyle}>
                  {(form.buildType === 'truck-and-trailer' ? HYDRAULICS_TRUCK_AND_DOG : HYDRAULICS_TRUCK).map((h) => {
                    const twinPn = form.truckMaterial === 'Aluminium' ? '121.15.104' : '121.15.113'
                    const label =
                      h === 'Truck and Trailer spool valve' ? `Truck and Trailer spool valve — ${twinPn}` :
                      h === 'Single spool valve' ? `Single spool valve — 121.8.185` :
                      h
                    return <option key={h} value={h}>{label}</option>
                  })}
                </select>
              </Field>
            </div>
            {/* Tarp section */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Tarp</div>
            <div style={grid(4)}>
              <Field label="Tarp Material">
                <select value={form.truckTarpMaterial} onChange={(e) => set('truckTarpMaterial', e.target.value)} style={selectStyle}>
                  {TARP_MATERIALS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tarp Colour">
                <input value={form.truckTarpColour} onChange={(e) => set('truckTarpColour', e.target.value)} placeholder="e.g. Black" style={inputStyle} />
              </Field>
              <Field label="Tarp Type">
                <select value={form.truckTarpType} onChange={(e) => set('truckTarpType', e.target.value)} style={selectStyle}>
                  {TARP_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Bow Height">
                <input value={truckBowHeight} readOnly placeholder="Auto from material + height" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: truckBowHeight ? '#E8681A' : 'rgba(255,255,255,0.3)' }} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Tarp Style">
                <select value={form.truckTarpStyle} onChange={(e) => set('truckTarpStyle', e.target.value)} style={selectStyle}>
                  {TARP_STYLES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tarp Location">
                <select value={form.truckTarpLocation} onChange={(e) => set('truckTarpLocation', e.target.value)} style={selectStyle}>
                  {TARP_LOCATIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            {/* Body extras */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Body Extras</div>
            <div style={grid(4)}>
              <Field label="Ladder Type">
                <select value={form.truckLadderType} onChange={(e) => set('truckLadderType', e.target.value)} style={selectStyle}>
                  {LADDER_TYPES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Ladder Position">
                <select value={form.truckLadderPosition} onChange={(e) => set('truckLadderPosition', e.target.value)} style={selectStyle}>
                  {LADDER_POSITIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Spreader Chain">
                <select value={form.truckSpreaderChain} onChange={(e) => set('truckSpreaderChain', e.target.value)} style={selectStyle}>
                  {['Yes', 'No'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Rear CAT Markers">
                <select value={form.truckCatMarkers} onChange={(e) => set('truckCatMarkers', e.target.value)} style={selectStyle}>
                  {['Yes', 'No'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ ...grid(3), marginTop: 16 }}>
              <Field label="Reflectors">
                <input value={form.truckReflectors} onChange={(e) => set('truckReflectors', e.target.value)} placeholder="e.g. 4 x Side Reflectors" style={inputStyle} />
              </Field>
              <Field label="Camera">
                <input value={form.truckCamera} onChange={(e) => set('truckCamera', e.target.value)} placeholder="e.g. Rear reversing camera" style={inputStyle} />
              </Field>
              <Field label="Vibrator">
                <select value={form.truckVibrator} onChange={(e) => set('truckVibrator', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Hose Burst Valve">
                <select value={form.truckHoseBurstValve} onChange={(e) => set('truckHoseBurstValve', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Chassis Extension">
                <select value={form.truckChassisExtension} onChange={(e) => set('truckChassisExtension', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Beavertail Config ── */}
        {hasBeavertail && (
          <SectionCard title="Beavertail Configuration" icon="🔧" style={{ marginTop: 20 }}>
            {/* Dimensions */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Deck Dimensions</div>
            <div style={grid(4)}>
              <Field label="Deck Width (mm)">
                <input value={form.btDeckWidth} onChange={(e) => set('btDeckWidth', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Overall Length (mm)">
                <input value={form.btDeckLength} onChange={(e) => set('btDeckLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Flat Deck Section (mm)">
                <input value={form.btFlatDeckLength} onChange={(e) => set('btFlatDeckLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Tail Section (mm)">
                <input value={form.btTailLength} onChange={(e) => set('btTailLength', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(3), marginTop: 16 }}>
              <Field label="Tail Angle (degrees)">
                <input value={form.btTailAngle} onChange={(e) => set('btTailAngle', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Extension (mm)">
                <input value={form.btRampExtension} onChange={(e) => set('btRampExtension', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Floor Plate">
                <input value={form.btFloorPlate} onChange={(e) => set('btFloorPlate', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Cross-Members">
                <input value={form.btCrossMembers} onChange={(e) => set('btCrossMembers', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Ramps */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Ramps</div>
            <div style={grid(4)}>
              <Field label="Ramp Type">
                <input value={form.btRampType} onChange={(e) => set('btRampType', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Width (mm)">
                <input value={form.btRampWidth} onChange={(e) => set('btRampWidth', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Length (mm)">
                <input value={form.btRampActualLength} onChange={(e) => set('btRampActualLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Capacity">
                <input value={form.btRampCapacity} onChange={(e) => set('btRampCapacity', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Hydraulics */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Hydraulics</div>
            <Field label="Hydraulic System">
              <input value={form.btHydraulics} onChange={(e) => set('btHydraulics', e.target.value)} style={inputStyle} />
            </Field>
            {/* Accessories */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Accessories</div>
            <div style={grid(2)}>
              <Field label="Stabiliser Legs">
                <input value={form.btStabiliserLegs} onChange={(e) => set('btStabiliserLegs', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Chain Points">
                <input value={form.btChainPoints} onChange={(e) => set('btChainPoints', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Shovel Racks">
                <input value={form.btShovelRacks} onChange={(e) => set('btShovelRacks', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Tool Box (L×W×H mm)">
                <input value={form.btToolbox} onChange={(e) => set('btToolbox', e.target.value)} placeholder="e.g. 900 x 450 x 450" style={inputStyle} />
              </Field>
            </div>
            {/* Paint & Lighting */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Paint & Lighting</div>
            <div style={grid(2)}>
              <Field label="Lights">
                <input value={form.btLights} onChange={(e) => set('btLights', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Paint">
                <input value={form.btPaint} onChange={(e) => set('btPaint', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Chassis */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Chassis</div>
            <div style={grid(3)}>
              <Field label="Chassis Make">
                <input value={form.chassisMake} onChange={(e) => set('chassisMake', e.target.value)} placeholder="e.g. Kenworth" style={inputStyle} />
              </Field>
              <Field label="Chassis Model">
                <input value={form.chassisModel} onChange={(e) => set('chassisModel', e.target.value)} placeholder="e.g. T610" style={inputStyle} />
              </Field>
              <Field label="Variant">
                <input value={form.chassisVariant} onChange={(e) => set('chassisVariant', e.target.value)} placeholder="e.g. SAR, 6x4" style={inputStyle} />
              </Field>
            </div>
            {/* Engineering note */}
            <div style={{ ...grid(1), marginTop: 16 }}>
              <Field label="Engineering Note">
                <input value={form.btEngineeringNote} onChange={(e) => set('btEngineeringNote', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Generate spec button */}
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  const spec = buildBeavertailSpec(form)
                  const existing = form.lineItems.filter(l => l.section !== 'Beavertail' && l.section !== 'Chassis Mods')
                  const basePrice = form.lineItems.find(l => l.section === 'Beavertail')?.unitPrice ?? 0
                  setForm(f => ({
                    ...f,
                    lineItems: [
                      { section: 'Beavertail', description: spec, quantity: 1, unitPrice: basePrice, totalPrice: basePrice, sortOrder: 0 },
                      { section: 'Chassis Mods', description: 'Rear Chassis Modifications', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: 1 },
                      ...existing.map((l, i) => ({ ...l, sortOrder: i + 2 })),
                    ],
                  }))
                }}
                style={{ padding: '10px 20px', background: 'rgba(232,104,26,0.15)', border: '1px solid rgba(232,104,26,0.4)', borderRadius: 8, color: '#E8681A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                ↻ Regenerate Spec Line Items
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Tag Trailer Configuration ── */}
        {hasTagTrailer && (
          <SectionCard title="Tag Trailer Configuration" icon="🏗️" style={{ marginTop: 20 }}>
            {/* Dimensions */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Deck Dimensions</div>
            <div style={grid(4)}>
              <Field label="Deck Width (mm)">
                <input value={form.btDeckWidth} onChange={(e) => set('btDeckWidth', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Flat Deck Section (mm)">
                <input value={form.btFlatDeckLength} onChange={(e) => set('btFlatDeckLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Beavertail Section (mm)">
                <input value={form.btTailLength} onChange={(e) => set('btTailLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Tail Angle (degrees)">
                <input value={form.btTailAngle} onChange={(e) => set('btTailAngle', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Floor Plate">
                <input value={form.btFloorPlate} onChange={(e) => set('btFloorPlate', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Cross-Members">
                <input value={form.btCrossMembers} onChange={(e) => set('btCrossMembers', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Ramps */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Ramps</div>
            <div style={grid(4)}>
              <Field label="Ramp Type">
                <input value={form.btRampType} onChange={(e) => set('btRampType', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Width (mm)">
                <input value={form.btRampWidth} onChange={(e) => set('btRampWidth', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Length (mm)">
                <input value={form.btRampActualLength} onChange={(e) => set('btRampActualLength', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ramp Capacity">
                <input value={form.btRampCapacity} onChange={(e) => set('btRampCapacity', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Hydraulics */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Hydraulics & Power</div>
            <Field label="Hydraulic / Power System">
              <input value={form.btHydraulics} onChange={(e) => set('btHydraulics', e.target.value)} style={inputStyle} />
            </Field>
            {/* Axles & Suspension */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Axles & Suspension</div>
            <div style={grid(4)}>
              <Field label="Axle Make">
                <input value={form.trailerAxleMake} onChange={(e) => set('trailerAxleMake', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Axle Count">
                <input type="number" value={form.trailerAxleCount} onChange={(e) => set('trailerAxleCount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Brake Type">
                <input value={form.trailerAxleType} onChange={(e) => set('trailerAxleType', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Suspension">
                <input value={form.trailerSuspension} onChange={(e) => set('trailerSuspension', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Accessories */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Accessories</div>
            <div style={grid(2)}>
              <Field label="Drawbar Landing Leg">
                <input value={form.btStabiliserLegs} onChange={(e) => set('btStabiliserLegs', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Chain Points">
                <input value={form.btChainPoints} onChange={(e) => set('btChainPoints', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Hammer Well (L×W×H mm)">
                <input value={form.btToolbox} onChange={(e) => set('btToolbox', e.target.value)} placeholder="e.g. 2000 x 750 x 450" style={inputStyle} />
              </Field>
              <Field label="Shovel Racks">
                <input value={form.btShovelRacks} onChange={(e) => set('btShovelRacks', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Paint & Lighting */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Paint & Lighting</div>
            <div style={grid(2)}>
              <Field label="Lights">
                <input value={form.btLights} onChange={(e) => set('btLights', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Paint">
                <input value={form.btPaint} onChange={(e) => set('btPaint', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Chassis */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Towing Chassis</div>
            <div style={grid(3)}>
              <Field label="Chassis Make">
                <input value={form.chassisMake} onChange={(e) => set('chassisMake', e.target.value)} placeholder="e.g. Kenworth" style={inputStyle} />
              </Field>
              <Field label="Chassis Model">
                <input value={form.chassisModel} onChange={(e) => set('chassisModel', e.target.value)} placeholder="e.g. T610" style={inputStyle} />
              </Field>
              <Field label="Variant">
                <input value={form.chassisVariant} onChange={(e) => set('chassisVariant', e.target.value)} placeholder="e.g. SAR, 6x4" style={inputStyle} />
              </Field>
            </div>
            {/* Engineering note */}
            <div style={{ ...grid(1), marginTop: 16 }}>
              <Field label="Engineering Note">
                <input value={form.btEngineeringNote} onChange={(e) => set('btEngineeringNote', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            {/* Generate spec button */}
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  const spec = buildTagTrailerSpec(form)
                  const existing = form.lineItems.filter(l => l.section !== 'Tag Trailer' && l.section !== 'Chassis Mods')
                  const basePrice = form.lineItems.find(l => l.section === 'Tag Trailer')?.unitPrice ?? 0
                  setForm(f => ({
                    ...f,
                    lineItems: [
                      { section: 'Tag Trailer', description: spec, quantity: 1, unitPrice: basePrice, totalPrice: basePrice, sortOrder: 0 },
                      { section: 'Chassis Mods', description: 'Drawbar and coupling fitment', quantity: 1, unitPrice: 0, totalPrice: 0, sortOrder: 1 },
                      ...existing.map((l, i) => ({ ...l, sortOrder: i + 2 })),
                    ],
                  }))
                }}
                style={{ padding: '10px 20px', background: 'rgba(232,104,26,0.15)', border: '1px solid rgba(232,104,26,0.4)', borderRadius: 8, color: '#E8681A', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                ↻ Regenerate Spec Line Items
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Repairs / Warranty Config ── */}
        {hasRepairs && (
          <SectionCard title="Repair / Warranty Details" icon="🔩" style={{ marginTop: 20 }}>
            <div style={grid(2)}>
              <Field label="Unit / Vehicle">
                <input
                  value={form.repairUnit}
                  onChange={(e) => set('repairUnit', e.target.value)}
                  placeholder="e.g. YLZ1080 — Alloy Tipper on Kenworth T409"
                  style={inputStyle}
                />
              </Field>
              <Field label="Warranty Claim?">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 38 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form.repairWarranty}
                      onChange={(e) => set('repairWarranty', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#E8681A' }}
                    />
                    Yes — this is a warranty claim
                  </label>
                </div>
              </Field>
            </div>
            {form.repairWarranty && (
              <div style={{ ...grid(1), marginTop: 16 }}>
                <Field label="Original Job Number">
                  <input
                    value={form.repairOriginalJob}
                    onChange={(e) => set('repairOriginalJob', e.target.value.toUpperCase())}
                    placeholder="e.g. YLZ1080"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Field label="Scope of Work / Repair Description">
                <textarea
                  value={form.repairDescription}
                  onChange={(e) => set('repairDescription', e.target.value)}
                  placeholder="Describe the repair or warranty work required..."
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Trailer Config ── */}
        {hasTrailer && (
          <SectionCard
            title={form.buildType === 'truck-and-trailer' ? 'Trailer Configuration' : 'Trailer Configuration'}
            icon="🚜"
            style={{ marginTop: 20 }}
          >
            <div style={grid(3)}>
              <Field label="Trailer Model">
                <select value={form.trailerModel} onChange={(e) => set('trailerModel', e.target.value)} style={selectStyle}>
                  {TRAILER_MODELS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Trailer Type">
                <select value={form.trailerType} onChange={(e) => set('trailerType', e.target.value)} style={selectStyle}>
                  {TRAILER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Material">
                <select value={form.trailerMaterial} onChange={(e) => set('trailerMaterial', e.target.value)} style={selectStyle}>
                  {['Aluminium', 'Steel', 'Hardox 500', 'Hardox 450'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ ...grid(5), marginTop: 16 }}>
              <Field label="Axle Make">
                <select value={form.trailerAxleMake} onChange={(e) => set('trailerAxleMake', e.target.value)} style={selectStyle}>
                  {AXLE_MAKES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Axle Count">
                <input type="number" value={form.trailerAxleCount} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default' }} />
              </Field>
              <Field label="Axle Type">
                <select value={form.trailerAxleType} onChange={(e) => set('trailerAxleType', e.target.value)} style={selectStyle}>
                  {AXLE_TYPES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Suspension">
                <select value={form.trailerSuspension} onChange={(e) => set('trailerSuspension', e.target.value)} style={selectStyle}>
                  {SUSPENSIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Stud Pattern">
                <select value={form.trailerStudPattern} onChange={(e) => set('trailerStudPattern', e.target.value)} style={selectStyle}>
                  {STUD_PATTERNS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {/* Booster & Slack settings — auto from axle make/type/count */}
            {trailerAxleSettings ? (
              <div style={{ ...grid(2), marginTop: 16 }}>
                <Field label="Booster Settings">
                  <input value={trailerAxleSettings.boosters.map((v, i) => `${i + 1}: ${v}`).join('  |  ')} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: '#E8681A', fontSize: 12 }} />
                </Field>
                <Field label="Slack Lengths">
                  <input value={trailerAxleSettings.slacks.map((v, i) => `${i + 1}: ${v}mm`).join('  |  ')} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: '#E8681A', fontSize: 12 }} />
                </Field>
              </div>
            ) : form.trailerAxleType !== 'Drum or Disc (customer choice)' ? (
              <div style={{ ...grid(2), marginTop: 16 }}>
                <Field label="Booster Settings">
                  <input value="TBC" readOnly style={{ ...inputStyle, opacity: 0.5, cursor: 'default', color: 'rgba(255,255,255,0.4)' }} />
                </Field>
                <Field label="Slack Lengths">
                  <input value="TBC" readOnly style={{ ...inputStyle, opacity: 0.5, cursor: 'default', color: 'rgba(255,255,255,0.4)' }} />
                </Field>
              </div>
            ) : null}
            <div style={{ ...grid(4), marginTop: 16 }}>
              <Field label="Floor Sheet">
                <input value={form.trailerFloorSheet} onChange={(e) => set('trailerFloorSheet', e.target.value)} placeholder="e.g. 8mm Aluminium" style={inputStyle} />
              </Field>
              <Field label="Side Sheet">
                <input value={form.trailerSideSheet} onChange={(e) => set('trailerSideSheet', e.target.value)} placeholder="e.g. 5mm Aluminium" style={inputStyle} />
              </Field>
              <Field label="Hoist Model">
                <input value={form.trailerHoist} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: '#E8681A' }} />
              </Field>
              <Field label="Push Lugs">
                <select value={form.trailerPushLugs} onChange={(e) => set('trailerPushLugs', e.target.value)} style={selectStyle}>
                  <option value="">Select...</option>
                  <option>No</option>
                  <option>Yes</option>
                  <option>Yes with Shute between</option>
                </select>
              </Field>
              <Field label="PBS Rating">
                <input value={form.trailerPbs} onChange={(e) => set('trailerPbs', e.target.value)} placeholder="e.g. 56.5T GCM" style={inputStyle} />
              </Field>
            </div>
            {/* Wheels & Tyres */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Wheels &amp; Tyres</div>
            <div style={grid(3)}>
              <Field label="Tyre">
                <select value={form.trailerTyre} onChange={(e) => set('trailerTyre', e.target.value)} style={selectStyle}>
                  <option value="">Select...</option>
                  {TRAILER_TYRES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Inner Wheels">
                <select value={form.trailerInnerWheels} onChange={(e) => set('trailerInnerWheels', e.target.value)} style={selectStyle}>
                  <option value="">Select...</option>
                  {TRAILER_WHEELS.filter((w) => !form.trailerStudPattern || w.endsWith(`- ${form.trailerStudPattern.replace('PCD', '')}`)).map((w) => <option key={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Outer Wheels">
                <select value={form.trailerOuterWheels} onChange={(e) => set('trailerOuterWheels', e.target.value)} style={selectStyle}>
                  <option value="">Select...</option>
                  {TRAILER_WHEELS.filter((w) => !form.trailerStudPattern || w.endsWith(`- ${form.trailerStudPattern.replace('PCD', '')}`)).map((w) => <option key={w}>{w}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Tarp</div>
            <div style={grid(4)}>
              <Field label="Tarp System">
                <select value={form.trailerTarp} onChange={(e) => set('trailerTarp', e.target.value)} style={selectStyle}>
                  {TARPS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tarp Colour">
                <input value={form.trailerTarpColour} onChange={(e) => set('trailerTarpColour', e.target.value)} placeholder="e.g. Black" style={inputStyle} />
              </Field>
              <Field label="Tarp Material">
                <select value={form.trailerTarpMaterial} onChange={(e) => set('trailerTarpMaterial', e.target.value)} style={selectStyle}>
                  {TARP_MATERIALS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tarp Type">
                <select value={form.trailerTarpType} onChange={(e) => set('trailerTarpType', e.target.value)} style={selectStyle}>
                  {TARP_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ ...grid(3), marginTop: 16 }}>
              <Field label="Tarp Location">
                <select value={form.trailerTarpLocation} onChange={(e) => set('trailerTarpLocation', e.target.value)} style={selectStyle}>
                  {TARP_LOCATIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tarp Bow Height">
                <input value={trailerBowHeight} readOnly placeholder="Auto from material + height" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: trailerBowHeight ? '#E8681A' : 'rgba(255,255,255,0.3)' }} />
              </Field>
              <Field label="Tarp Length (mm)">
                <input
                  value={form.trailerTarpLength}
                  onChange={(e) => set('trailerTarpLength', e.target.value)}
                  placeholder="Auto from body length"
                  style={{ ...inputStyle, color: form.trailerTarpLength ? '#fff' : 'rgba(255,255,255,0.3)' }}
                />
              </Field>
            </div>
            <div style={{ ...grid(4), marginTop: 16 }}>
              <Field label="Axle Lift">
                <select value={form.trailerAxleLift} onChange={(e) => { set('trailerAxleLift', e.target.value); if (e.target.value === 'No') set('trailerAxleLiftAxle', '') }} style={selectStyle}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </Field>
              {form.trailerAxleLift === 'Yes' && (
                <Field label="Lift Axle">
                  <input value={form.trailerAxleLiftAxle} onChange={(e) => set('trailerAxleLiftAxle', e.target.value)} placeholder="e.g. Axle 1" style={inputStyle} />
                </Field>
              )}
              <Field label="Hubodometer">
                <input value="Yes" readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default' }} />
              </Field>
<Field label="Hose Burst Valve">
                <input value="Yes" readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default' }} />
              </Field>
            </div>
            {/* Body Extras */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Body Extras</div>
            <div style={grid(4)}>
              <Field label="Side Lights">
                <select value={form.trailerSideLights} onChange={(e) => set('trailerSideLights', e.target.value)} style={selectStyle}>
                  {SIDE_LIGHTS.map((o) => <option key={o}>{o}</option>)}
                </select>
                {form.trailerSideLights === 'Define quantity...' && (
                  <input value={form.trailerSideLightsCustom} onChange={(e) => set('trailerSideLightsCustom', e.target.value)} placeholder="e.g. 4 side lights c/w polished backing strip" style={{ ...inputStyle, marginTop: 6 }} />
                )}
              </Field>
              <Field label="Indicators">
                <select value={form.trailerIndicators} onChange={(e) => set('trailerIndicators', e.target.value)} style={selectStyle}>
                  {INDICATORS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Grain Doors">
                <select value={form.trailerGrainDoors} onChange={(e) => set('trailerGrainDoors', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Grain Locks">
                <select value={form.trailerGrainLocks} onChange={(e) => set('trailerGrainLocks', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
            <div style={grid(4)}>
              <Field label="Rear Ladder">
                <select value={form.trailerRearLadder} onChange={(e) => set('trailerRearLadder', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Centre Chain">
                <select value={form.trailerCentreChain} onChange={(e) => set('trailerCentreChain', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Rear CAT Markers">
                <select value={form.trailerCatMarkers} onChange={(e) => set('trailerCatMarkers', e.target.value)} style={selectStyle}>
                  <option>No</option>
                  <option>Yes (inc. &apos;DNOTV&apos; Signage)</option>
                </select>
              </Field>
              <Field label="Reflectors">
                <input value="Yes (Amber)" readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default' }} />
              </Field>
              <Field label="Camera">
                <select value={form.trailerCamera} onChange={(e) => set('trailerCamera', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Vibrator">
                <select value={form.trailerVibrator} onChange={(e) => set('trailerVibrator', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              {form.trailerMaterial === 'Aluminium' && (
                <Field label="Rock Sheet">
                  <select value={form.trailerRockSheet} onChange={(e) => set('trailerRockSheet', e.target.value)} style={selectStyle}>
                    {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Liner">
                <select value={form.trailerLiner} onChange={(e) => set('trailerLiner', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Anti Spray Suppressant">
                <select value={form.trailerAntiSpray} onChange={(e) => set('trailerAntiSpray', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            {/* Drawbar */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>Drawbar</div>
            <div style={grid(3)}>
              <Field label="Drawbar Tape">
                <select value={form.trailerDrawbarTape} onChange={(e) => set('trailerDrawbarTape', e.target.value)} style={selectStyle}>
                  {['No', 'Yes (Amber)', 'Yes (White)'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Drawbar Coupling">
                <select value={form.trailerDrawbarCoupling} onChange={(e) => set('trailerDrawbarCoupling', e.target.value)} style={selectStyle}>
                  {['To suit V.Orlandi', 'To Suit Ringfeder'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Anderson Plug">
                <select value={form.trailerAndersonPlug} onChange={(e) => set('trailerAndersonPlug', e.target.value)} style={selectStyle}>
                  {['Yes', 'No'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Wheel Carrier on Drawbar">
                <select value={form.trailerWheelCarrier} onChange={(e) => set('trailerWheelCarrier', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Drop Down Leg">
                <select value={form.trailerDropDownLeg} onChange={(e) => set('trailerDropDownLeg', e.target.value)} style={selectStyle}>
                  {['Drop Down', 'Wind Down'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Pogo Stick">
                <select value={form.trailerPogoStick} onChange={(e) => set('trailerPogoStick', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Engineering Details ── */}
        <SectionCard title="Engineering Details" icon="📐" style={{ marginTop: 20 }}>
          {hasTruck && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                {form.buildType === 'truck-and-trailer' ? 'Truck / Chassis' : 'Chassis'}
              </div>
              {/* Row 1: chassis + identity */}
              <div style={grid(5)}>
                <Field label="Chassis Make">
                  <input
                    list="chassis-makes"
                    value={form.chassisMake}
                    onChange={(e) => set('chassisMake', e.target.value)}
                    placeholder="e.g. Kenworth"
                    style={inputStyle}
                  />
                  <datalist id="chassis-makes">
                    {CHASSIS_MAKES.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </Field>
                <Field label="Chassis Model">
                  <input
                    list="chassis-models"
                    value={form.chassisModel}
                    onChange={(e) => set('chassisModel', e.target.value)}
                    placeholder="e.g. T409"
                    style={inputStyle}
                  />
                  <datalist id="chassis-models">
                    {(CHASSIS_MODELS[form.chassisMake] ?? Object.values(CHASSIS_MODELS).flat()).map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Variant">
                  <input value={form.chassisVariant} onChange={(e) => set('chassisVariant', e.target.value)} placeholder="e.g. SAR, 6x4" style={inputStyle} />
                </Field>
                <Field label="Serial No.">
                  <input value={form.truckSerial} onChange={(e) => set('truckSerial', e.target.value)} placeholder="e.g. YLZ-00123" style={inputStyle} />
                </Field>
                <Field label="VIN">
                  <input value={form.truckVin} onChange={(e) => set('truckVin', e.target.value)} placeholder="17-char VIN" style={inputStyle} />
                </Field>
              </div>
              {/* Row 2: dimensions */}
              <div style={{ ...grid(6), marginTop: 16 }}>
                <Field label="Body Length (mm)">
                  <input value={form.truckBodyLength} onChange={(e) => set('truckBodyLength', e.target.value)} placeholder="e.g. 5400" style={inputStyle} />
                </Field>
                <Field label="Body Width (mm)">
                  <input value={truckBodyWidth} readOnly placeholder="Auto from material" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: '#E8681A' }} />
                </Field>
                <Field label="Main Runner Width (mm)">
                  <input value={form.truckMainRunnerWidth} onChange={(e) => set('truckMainRunnerWidth', e.target.value)} placeholder="e.g. 820" style={inputStyle} />
                </Field>
                <Field label="Body Height (mm)">
                  <input value={form.truckBodyHeight} onChange={(e) => set('truckBodyHeight', e.target.value)} placeholder="e.g. 1200" style={inputStyle} />
                </Field>
                <Field label="Capacity (m³)">
                  <input value={truckBodyCapacity} readOnly placeholder="Auto from dimensions" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: truckBodyCapacity ? '#E8681A' : 'rgba(255,255,255,0.3)' }} />
                </Field>
                <Field label="Tare Estimate (kg)">
                  <input value={form.truckTare} onChange={(e) => set('truckTare', e.target.value)} placeholder="e.g. 3200" style={inputStyle} />
                </Field>
              </div>
              {/* Row 2b: hoist + pivot centre (auto-derived from body length) */}
              <div style={{ ...grid(3), marginTop: 16 }}>
                <Field label="Hoist (from body length)">
                  <input value={form.truckHoist} readOnly style={{ ...inputStyle, opacity: 0.6, cursor: 'default', color: form.truckHoist ? '#E8681A' : 'rgba(255,255,255,0.3)' }} title="Auto-selected from body length — change in Spec section to override" />
                </Field>
                <Field label="C/L Pivot to Rear (mm)">
                  <input
                    value={form.truckPivotCentre}
                    onChange={(e) => set('truckPivotCentre', e.target.value)}
                    placeholder="Auto from body length"
                    style={{ ...inputStyle, color: form.truckPivotCentre ? '#E8681A' : 'rgba(255,255,255,0.3)' }}
                  />
                </Field>
                <Field label="Tarp Length (mm)">
                  <input
                    value={form.truckTarpLength}
                    onChange={(e) => set('truckTarpLength', e.target.value)}
                    placeholder="Auto from body length"
                    style={{ ...inputStyle, color: form.truckTarpLength ? '#fff' : 'rgba(255,255,255,0.3)' }}
                  />
                </Field>
              </div>
              {/* Row 3: weight + paint */}
              <div style={{ ...grid(4), marginTop: 16 }}>
                <Field label="GVM (kg)">
                  <input value={form.truckGvm} onChange={(e) => set('truckGvm', e.target.value)} placeholder="e.g. 25000" style={inputStyle} />
                </Field>
                <Field label="Subframe Colour">
                  <input value={form.truckSubframeColour} onChange={(e) => set('truckSubframeColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
                </Field>
                <Field label="Body Colour">
                  <input value={form.truckBodyColour} onChange={(e) => set('truckBodyColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
                </Field>
                <Field label="D-Value (kN)">
                  <input value={form.truckDValue} onChange={(e) => set('truckDValue', e.target.value)} placeholder="e.g. 180" style={inputStyle} />
                </Field>
                <Field label="Coupling Vertical Load">
                  <input
                    value={form.truckCouplingLoad}
                    onChange={(e) => set('truckCouplingLoad', e.target.value)}
                    placeholder="Auto from coupling"
                    style={{ ...inputStyle, color: form.truckCouplingLoad ? '#fff' : 'rgba(255,255,255,0.3)' }}
                  />
                </Field>
              </div>
              {/* Row 4: controls detail */}
              <div style={{ ...grid(4), marginTop: 16 }}>
                <Field label="PTO">
                  <input
                    list="pto-options"
                    value={form.truckPto}
                    onChange={(e) => set('truckPto', e.target.value)}
                    placeholder="Select or type PTO..."
                    style={inputStyle}
                  />
                  <datalist id="pto-options">
                    {PTO_OPTIONS.map((o) => <option key={o} value={o} />)}
                  </datalist>
                </Field>
                <Field label="Pump">
                  <select value={form.truckPump} onChange={(e) => set('truckPump', e.target.value)} style={selectStyle}>
                    {PUMP_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Tailgate Type">
                  <select value={form.truckTailgateType} onChange={(e) => set('truckTailgateType', e.target.value)} style={selectStyle}>
                    {TAILGATE_TYPES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Tailgate Lights">
                  <select value={form.truckTailgateLights} onChange={(e) => set('truckTailgateLights', e.target.value)} style={selectStyle}>
                    {TAILGATE_LIGHTS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              {/* Row 4b: tail lights */}
              <div style={{ ...grid(2), marginTop: 16 }}>
                <Field label="Tail Lights">
                  <select value={form.truckTailLights} onChange={(e) => set('truckTailLights', e.target.value)} style={selectStyle}>
                    {TAIL_LIGHTS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              {/* Row 5: hydraulic tank */}
              <div style={{ ...grid(2), marginTop: 16 }}>
                <Field label="Hydraulic Tank Type">
                  <select value={form.truckHydTankType} onChange={(e) => set('truckHydTankType', e.target.value)} style={selectStyle}>
                    {HYD_TANK_TYPES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Hydraulic Tank Location">
                  <select value={form.truckHydTankLocation} onChange={(e) => set('truckHydTankLocation', e.target.value)} style={selectStyle}>
                    {HYD_TANK_LOCATIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
              {hasTrailer && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />}
            </>
          )}
          {hasTrailer && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
                Trailer
              </div>
              {/* Row 1: identity */}
              <div style={grid(4)}>
                <Field label="Serial No.">
                  <input value={form.trailerSerial} onChange={(e) => set('trailerSerial', e.target.value)} placeholder="e.g. YLZ-00124" style={inputStyle} />
                </Field>
                <Field label="VIN">
                  <input value={form.trailerVin} onChange={(e) => set('trailerVin', e.target.value)} placeholder="Auto-generated on acceptance" style={inputStyle} />
                </Field>
                <Field label="Chassis Colour">
                  <input value={form.trailerChassisColour} onChange={(e) => set('trailerChassisColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
                </Field>
                <Field label="Body Colour">
                  <input value={form.trailerBodyColour} onChange={(e) => set('trailerBodyColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
                </Field>
                <Field label="GTM (kg)">
                  <input value={form.trailerGtm} onChange={(e) => set('trailerGtm', e.target.value)} placeholder="e.g. 30000" style={inputStyle} />
                </Field>
              </div>
              {/* Row 2: more weights */}
              <div style={{ ...grid(4), marginTop: 16 }}>
                <Field label="GCM (kg)">
                  <input value={form.trailerGcm} onChange={(e) => set('trailerGcm', e.target.value)} placeholder="e.g. 57500" style={inputStyle} />
                </Field>
                <Field label="Tare Estimate (kg)">
                  <input value={form.trailerTare} onChange={(e) => set('trailerTare', e.target.value)} placeholder="e.g. 5200" style={inputStyle} />
                </Field>
              </div>
              {/* Row 3: body dimensions */}
              <div style={{ ...grid(5), marginTop: 16 }}>
                <Field label="Body Length (mm)">
                  <select value={form.trailerBodyLength} onChange={(e) => set('trailerBodyLength', e.target.value)} style={selectStyle}>
                    <option value="">Select...</option>
                    {TRAILER_BODY_LENGTHS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Body Width (mm)">
                  <input value={trailerBodyWidth} readOnly placeholder="Auto from material" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: '#E8681A' }} />
                </Field>
                <Field label="Main Runner Width Inside (mm)">
                  <input value={form.trailerMainRunnerWidth} readOnly style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: form.trailerMainRunnerWidth ? '#E8681A' : 'rgba(255,255,255,0.3)' }} placeholder="Auto from material" />
                </Field>
                <Field label="Body Height (mm)">
                  <select value={form.trailerBodyHeight} onChange={(e) => set('trailerBodyHeight', e.target.value)} style={selectStyle}>
                    <option value="">Select...</option>
                    {(form.trailerMaterial === 'Aluminium' ? ['1400', '1500'] : ['1000', '1100', '1200']).map((h) => <option key={h}>{h}</option>)}
                  </select>
                </Field>
                <Field label="Capacity (m³)">
                  <input value={trailerBodyCapacity} readOnly placeholder="Auto from dimensions" style={{ ...inputStyle, opacity: 0.7, cursor: 'default', color: trailerBodyCapacity ? '#E8681A' : 'rgba(255,255,255,0.3)' }} />
                </Field>
              </div>
              {/* Row 4: chassis dimensions */}
              <div style={{ ...grid(4), marginTop: 16 }}>
                <Field label="Chassis Length (mm)">
                  <div style={{ position: 'relative' }}>
                    <input
                      value={form.trailerChassisLength}
                      onChange={(e) => set('trailerChassisLength', e.target.value)}
                      placeholder="Auto from body length"
                      style={{ ...inputStyle, width: '100%' }}
                    />
                    {form.trailerBodyLength && getChassisLength(form.trailerBodyLength) && (
                      <div style={{ fontSize: 10, color: '#E8681A', marginTop: 3 }}>
                        Auto: {getChassisLength(form.trailerBodyLength)}mm
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Wheelbase (mm)">
                  <input value={form.trailerWheelbase} onChange={(e) => set('trailerWheelbase', e.target.value)} placeholder="e.g. 6380" style={inputStyle} />
                </Field>
                <Field label="Drawbar Length (mm)">
                  <input value={form.trailerDrawbarLength} onChange={(e) => set('trailerDrawbarLength', e.target.value)} placeholder="e.g. 2400" style={inputStyle} />
                </Field>
                <Field label="C/L Pivot to Rear (mm)">
                  <input
                    value={form.trailerPivotCentre}
                    onChange={(e) => set('trailerPivotCentre', e.target.value)}
                    placeholder="Auto from body length"
                    style={{ ...inputStyle, color: form.trailerPivotCentre ? '#E8681A' : 'rgba(255,255,255,0.3)' }}
                  />
                  {form.trailerBodyLength && getTrailerPivotCentre(form.trailerBodyLength) && (
                    <div style={{ fontSize: 10, color: '#E8681A', marginTop: 3 }}>
                      Auto: {getTrailerPivotCentre(form.trailerBodyLength)}mm
                    </div>
                  )}
                </Field>
              </div>
              {/* Row 5: lighting + lock flap */}
              <div style={{ ...grid(3), marginTop: 16 }}>
                <Field label="Tailgate Type">
                  <select value={form.trailerTailgateType} onChange={(e) => set('trailerTailgateType', e.target.value)} style={selectStyle}>
                    {TAILGATE_TYPES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Tail Lights">
                  <select value={form.trailerTailLights} onChange={(e) => set('trailerTailLights', e.target.value)} style={selectStyle}>
                    {TAIL_LIGHTS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Tailgate Lights">
                  <select value={form.trailerTailgateLights} onChange={(e) => set('trailerTailgateLights', e.target.value)} style={selectStyle}>
                    {TAILGATE_LIGHTS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Trailer Lock Flap">
                  <select value={form.trailerLockFlap} onChange={(e) => set('trailerLockFlap', e.target.value)} style={selectStyle}>
                    {['Yes', 'No'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}
          <div style={{ marginTop: 20 }}>
            <Field label="Customer Requirements / Special Notes (shown on job sheet)">
              <textarea
                value={form.specialRequirements}
                onChange={(e) => set('specialRequirements', e.target.value)}
                rows={3}
                placeholder="e.g. Customer wants 600mm body sides, body to suit Hino wheelbase 4600mm, no drawbar..."
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── Section: Body Extras ── */}
        {hasTruck && (
          <SectionCard title="Body Extras" icon="🔩" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
              Selected extras auto-populate as line items in Pricing below.
            </div>
            <div style={grid(2)}>
              <Field label="Side Lights">
                <select value={form.truckSideLights} onChange={(e) => set('truckSideLights', e.target.value)} style={selectStyle}>
                  {SIDE_LIGHTS.map(o => <option key={o}>{o}</option>)}
                </select>
                {form.truckSideLights === 'Define quantity...' && (
                  <input value={form.truckSideLightsCustom} onChange={(e) => set('truckSideLightsCustom', e.target.value)} placeholder="e.g. 4 side lights c/w polished backing strip" style={{ ...inputStyle, marginTop: 6 }} />
                )}
              </Field>
              <Field label="Indicators">
                <select value={form.truckIndicators} onChange={(e) => set('truckIndicators', e.target.value)} style={selectStyle}>
                  {INDICATORS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Mudflaps">
                <select value={form.truckMudflaps} onChange={(e) => set('truckMudflaps', e.target.value)} style={selectStyle}>
                  {MUDFLAPS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Anti Spray Suppressant">
                <select value={form.truckAntiSpray} onChange={(e) => set('truckAntiSpray', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Underbody Shovel Holder">
                <select value={form.truckShovelHolder} onChange={(e) => set('truckShovelHolder', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Grain Doors">
                <select value={form.truckGrainDoors} onChange={(e) => set('truckGrainDoors', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Grain Locks">
                <select value={form.truckGrainLocks} onChange={(e) => set('truckGrainLocks', e.target.value)} style={selectStyle}>
                  {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Reverse Buzzer / Squawker">
                <select value={form.truckReverseBuzzer} onChange={(e) => set('truckReverseBuzzer', e.target.value)} style={selectStyle}>
                  {['None', 'Existing', 'Buzzer', 'Squawker'].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              {form.truckMaterial === 'Aluminium' && (
                <Field label="Body Spigot">
                  <select value={form.truckBodySpigot} onChange={(e) => set('truckBodySpigot', e.target.value)} style={selectStyle}>
                    {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              )}
              {form.truckMaterial === 'Aluminium' && (
                <Field label="Rock Sheet">
                  <select value={form.truckRockSheet} onChange={(e) => set('truckRockSheet', e.target.value)} style={selectStyle}>
                    {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              )}
              {form.truckMaterial === 'Aluminium' && (
                <Field label="Liner">
                  <select value={form.truckLiner} onChange={(e) => set('truckLiner', e.target.value)} style={selectStyle}>
                    {['No', 'Yes'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Section: Pricing ── */}
        <SectionCard title="Pricing & Line Items" icon="💰" style={{ marginTop: 20 }}>

          {/* Generate spec button */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => {
                handleGenerateSpec()
                // BUG-15: warn about unfilled engineering fields
                const hasTrk = form.buildType === 'truck-body' || form.buildType === 'truck-and-trailer'
                const hasTrl = form.buildType === 'trailer' || form.buildType === 'truck-and-trailer'
                const missing: string[] = []
                if (hasTrk) {
                  if (!form.truckBodyLength) missing.push('Truck Body Length')
                  if (!form.chassisMake)     missing.push('Chassis Make/Model')
                }
                if (hasTrl) {
                  if (!form.trailerBodyLength) missing.push('Trailer Body Length')
                }
                setSpecWarning(missing.length > 0 ? `Unfilled fields will appear as dashes: ${missing.join(', ')}` : null)
              }}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                padding: '9px 18px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(232,104,26,0.5)',
                background: 'rgba(232,104,26,0.08)',
                color: '#E8681A',
              }}
              title="Auto-fill line item descriptions from the configuration fields above. Fill in Engineering fields first for best results."
            >
              ⚡ Generate Spec Descriptions
            </button>
            <span style={{ marginLeft: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Fills in spec text from your configuration — fill Engineering fields first
            </span>
            {specWarning && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#eab308', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 4, padding: '6px 10px' }}>
                ⚠ {specWarning}
              </div>
            )}
          </div>

          {/* Line items table */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 70px 130px 130px 36px',
              gap: 8, marginBottom: 8,
              fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', padding: '0 4px',
            }}>
              <span>Section</span>
              <span>Description</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>Total</span>
              <span />
            </div>

            {form.lineItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                No line items — add one below
              </div>
            )}

            {form.lineItems.filter((item) => item.section !== 'Optional Extras').map((item) => {
              const idx = form.lineItems.indexOf(item)
              return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '140px 1fr 70px 130px 130px 36px',
                gap: 8, marginBottom: 6, alignItems: 'start',
              }}>
                <input
                  value={item.section}
                  onChange={(e) => updateLineItem(idx, 'section', e.target.value)}
                  style={{ ...inputStyle, fontSize: 12 }}
                  placeholder="Section"
                />
                <textarea
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, resize: 'vertical', minHeight: 38, fontFamily: 'inherit', lineHeight: 1.5 }}
                  placeholder="Description (multi-line supported — use ⚡ Generate Spec to auto-fill)"
                  rows={item.description.split('\n').length > 4 ? Math.min(item.description.split('\n').length + 1, 30) : 3}
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 12 }}
                  min={0}
                />
                {item.section === 'Body Extras' ? (
                  <div style={{ ...inputStyle, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', cursor: 'default', letterSpacing: 1 }}>INC</div>
                ) : (
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, fontSize: 12 }}
                    min={0}
                    step="any"
                  />
                )}
                <div style={{ ...inputStyle, fontSize: 13, fontWeight: 600, color: item.section === 'Body Extras' ? 'rgba(255,255,255,0.4)' : '#E8681A', cursor: 'default' }}>
                  {item.section === 'Body Extras' ? 'INC' : `$${fmt(item.totalPrice)}`}
                </div>
                <button
                  onClick={() => removeLineItem(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 16, padding: 4 }}
                  title="Remove"
                >×</button>
              </div>
              )
            })}

            <button
              onClick={addLineItem}
              style={{
                marginTop: 8, background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 6, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                padding: '8px 16px', fontSize: 12, width: '100%', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A'; e.currentTarget.style.color = '#E8681A' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >
              + Add Line Item
            </button>
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 340 }}>
                <TotalRow label="Subtotal" value={`$${fmt(subtotal)}`} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Margin</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={form.margin}
                      onChange={(e) => set('margin', parseFloat(e.target.value) || 0)}
                      style={{ ...inputStyle, width: 70, textAlign: 'right', padding: '5px 8px', fontSize: 12 }}
                      min={0}
                      max={100}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>%</span>
                    {marginAmt > 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>(+${fmt(marginAmt)})</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Overhead $</span>
                  <input
                    type="number"
                    value={form.overhead}
                    onChange={(e) => set('overhead', parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 120, textAlign: 'right', padding: '5px 8px', fontSize: 12 }}
                    min={0}
                    step="any"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Discount $</span>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={(e) => set('discount', parseFloat(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 120, textAlign: 'right', padding: '5px 8px', fontSize: 12 }}
                    min={0}
                    step="any"
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 4 }}>
                  <TotalRow
                    label="TOTAL (ex GST)"
                    value={`$${fmt(form.useOverride && form.overridePrice ? parseFloat(form.overridePrice) || 0 : calculatedTotal)}`}
                    large
                    accent={form.useOverride}
                  />
                </div>
              </div>
            </div>

            {/* Override */}
            <div style={{ marginTop: 20, padding: 16, background: '#0a0a0a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.useOverride}
                  onChange={(e) => set('useOverride', e.target.checked)}
                  style={{ accentColor: '#E8681A', width: 16, height: 16 }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: form.useOverride ? '#E8681A' : 'rgba(255,255,255,0.5)' }}>
                  Override price
                </span>
              </label>
              {form.useOverride && (
                <div style={{ ...grid(2), marginTop: 12 }}>
                  <Field label="Override Price ($)">
                    <input
                      type="number"
                      value={form.overridePrice}
                      onChange={(e) => set('overridePrice', e.target.value)}
                      placeholder="e.g. 45000"
                      style={inputStyle}
                      min={0}
                      step="any"
                    />
                  </Field>
                  <Field label="Override Reason">
                    <input
                      value={form.overrideNote}
                      onChange={(e) => set('overrideNote', e.target.value)}
                      placeholder="e.g. Agreed price with dealer"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Final price display */}
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                {form.useOverride ? 'Override Price (ex GST)' : 'Total (ex GST)'}
              </div>
              <div style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 38, fontWeight: 800, color: '#E8681A', lineHeight: 1,
              }}>
                ${fmt(effectiveTotal)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                incl. GST: ${fmt(inclGst)}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Section: Optional Extras ── */}
        <SectionCard title="Optional Extras" icon="➕" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Add-on items shown as a separate section on the quote PDF
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 130px 130px 36px',
            gap: 8, marginBottom: 8,
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', padding: '0 4px',
          }}>
            <span>Description</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Total</span>
            <span />
          </div>

          {form.lineItems.filter((item) => item.section === 'Optional Extras').length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No extras added yet
            </div>
          )}

          {form.lineItems.filter((item) => item.section === 'Optional Extras').map((item) => {
            const idx = form.lineItems.indexOf(item)
            return (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 70px 130px 130px 36px',
                gap: 8, marginBottom: 6, alignItems: 'start',
              }}>
                <input
                  value={item.description}
                  onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                  style={{ ...inputStyle, fontSize: 12 }}
                  placeholder="e.g. Toolbox, side steps, pintle hook..."
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 12 }}
                  min={0}
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 12 }}
                  min={0}
                  step="any"
                />
                <div style={{ ...inputStyle, fontSize: 13, fontWeight: 600, color: '#E8681A', cursor: 'default' }}>
                  ${fmt(item.totalPrice)}
                </div>
                <button
                  onClick={() => removeLineItem(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: 16, padding: 4 }}
                  title="Remove"
                >×</button>
              </div>
            )
          })}

          <button
            onClick={addExtra}
            style={{
              marginTop: 8, background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 6, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              padding: '8px 16px', fontSize: 12, width: '100%', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A'; e.currentTarget.style.color = '#E8681A' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
          >
            + Add Extra
          </button>
        </SectionCard>

        {/* ── Section: Notes ── */}
        <SectionCard title="Notes & Terms" icon="📝" style={{ marginTop: 20 }}>
          <div style={grid(2)}>
            <Field label="Internal Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={5}
                placeholder="Internal notes — not shown on customer quote"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </Field>
            <Field label="Terms & Conditions (customer-facing)">
              <textarea
                value={form.terms}
                onChange={(e) => set('terms', e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, fontSize: 12 }}
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── Section: Bill of Materials ── */}
        {savedId && (
          <SectionCard title="Bill of Materials" icon="📦" style={{ marginTop: 20 }}>
            {bomLoading ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Resolving BOMs…</div>
            ) : bomList.length === 0 ? (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                No BOMs resolved — add build details (material, hoist, tarp, axles etc.) and save.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Group by section */}
                {Array.from(new Set(bomList.map(b => b.section))).map(section => (
                  <div key={section} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                      {section}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {bomList.filter(b => b.section === section).map((b, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 4,
                          background: b.code === 'TBD' ? 'rgba(234,179,8,0.1)' : 'rgba(232,104,26,0.08)',
                          border: `1px solid ${b.code === 'TBD' ? 'rgba(234,179,8,0.3)' : 'rgba(232,104,26,0.25)'}`,
                          color: b.code === 'TBD' ? '#eab308' : 'rgba(255,255,255,0.8)',
                          fontFamily: 'monospace',
                        }}>
                          <span style={{ fontWeight: 700, color: b.code === 'TBD' ? '#eab308' : '#E8681A' }}>{b.code}</span>
                          {b.code !== 'TBD' && <span style={{ marginLeft: 6, fontFamily: 'inherit', fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{b.name}</span>}
                          {b.code === 'TBD' && <span style={{ marginLeft: 6, fontFamily: 'inherit', fontSize: 10 }}>{b.name}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                  {bomList.filter(b => b.code !== 'TBD').length} BOM{bomList.filter(b => b.code !== 'TBD').length !== 1 ? 's' : ''} resolved
                  {bomList.some(b => b.code === 'TBD') && <span style={{ color: '#eab308', marginLeft: 8 }}>· {bomList.filter(b => b.code === 'TBD').length} TBD — check manually</span>}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Bottom actions ── */}
        <div style={{
          marginTop: 28, marginBottom: 40,
          display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center',
        }}>
          {saveError && <span style={{ fontSize: 12, color: '#f87171' }}>{saveError}</span>}
          <button
            onClick={() => router.push('/quotes')}
            style={btnStyle('ghost')}
          >
            Cancel
          </button>
          {form.status === 'draft' && (
            <button onClick={() => handleSave('sent')} disabled={saving} style={btnStyle('secondary')}>
              Save & Mark Sent
            </button>
          )}
          <button onClick={() => handleSave()} disabled={saving} style={btnStyle('primary')}>
            {saving ? 'Saving…' : savedId ? '✓ Save' : 'Save Draft'}
          </button>
        </div>

      </div>

      {/* ── Accept confirmation modal ── */}
      {acceptModal && (
        <Modal onClose={() => setAcceptModal(false)}>
          <div style={{ padding: 32, maxWidth: 480 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
            <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
              Accept Quote?
            </h2>

            {/* Job assignment toggle */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                Job Assignment
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => setAcceptMode('new')}
                  style={{
                    fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    padding: '8px 16px', borderRadius: 4, cursor: 'pointer', minHeight: 36,
                    border: acceptMode === 'new' ? '1.5px solid rgba(34,197,94,0.6)' : '1px solid rgba(255,255,255,0.15)',
                    background: acceptMode === 'new' ? 'rgba(34,197,94,0.12)' : 'transparent',
                    color: acceptMode === 'new' ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  + Create New Job
                </button>
                <button
                  onClick={() => setAcceptMode('existing')}
                  style={{
                    fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    padding: '8px 16px', borderRadius: 4, cursor: 'pointer', minHeight: 36,
                    border: acceptMode === 'existing' ? '1.5px solid rgba(232,104,26,0.6)' : '1px solid rgba(255,255,255,0.15)',
                    background: acceptMode === 'existing' ? 'rgba(232,104,26,0.12)' : 'transparent',
                    color: acceptMode === 'existing' ? '#E8681A' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Link to Existing Job
                </button>
              </div>
              {acceptMode === 'new' && (
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
                    Job Number
                  </label>
                  <input
                    value={newJobNum}
                    onChange={(e) => setNewJobNum(e.target.value.toUpperCase())}
                    placeholder="e.g. YLZ1094"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#0a0a0a', border: '1px solid rgba(34,197,94,0.4)',
                      borderRadius: 4, color: '#fff', fontSize: 14, fontWeight: 600,
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                      letterSpacing: 1,
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                    Auto-filled with the next available number. Edit if needed.
                  </div>
                  {previewVin && (
                    <div style={{ marginTop: 16 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
                        Trailer VIN
                      </label>
                      <div style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#0a0a0a', border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: 4, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600,
                        padding: '10px 12px', fontFamily: 'monospace', letterSpacing: 1.5,
                      }}>
                        {previewVin}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                        Auto-assigned on acceptance.
                      </div>
                    </div>
                  )}
                </div>
              )}
              {acceptMode === 'existing' && (
                <div>
                  <input
                    autoFocus
                    value={existingJobNum}
                    onChange={(e) => setExistingJobNum(e.target.value.toUpperCase())}
                    placeholder="e.g. YLZ1050"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#0a0a0a', border: '1px solid rgba(232,104,26,0.4)',
                      borderRadius: 4, color: '#fff', fontSize: 14, fontWeight: 600,
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                      letterSpacing: 1,
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                    The quote will be linked to this job. No new job will be created.
                  </div>
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 8 }}>
              This will:
            </p>
            <ul style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
              <li>Mark quote <strong style={{ color: '#fff' }}>{form.quoteNumber}</strong> as Accepted</li>
              {acceptMode === 'new' ? (
                <>
                  <li>Create job <strong style={{ color: '#22c55e' }}>{newJobNum || '…'}</strong> on the Production Board</li>
                  <li>Stage the job at <strong style={{ color: '#fff' }}>Requires Engineering</strong></li>
                  <li>Create a draft Parts Order for Liz</li>
                </>
              ) : (
                <li>Link this quote to job <strong style={{ color: '#E8681A' }}>{existingJobNum || '…'}</strong></li>
              )}
              <li>Send workshop notification email (if configured)</li>
            </ul>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setAcceptModal(false)} style={btnStyle('ghost')}>
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting || (acceptMode === 'existing' && !existingJobNum.trim())}
                style={{ ...btnStyle('secondary'), borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.15)', color: 'rgba(34,197,94,0.9)' }}
              >
                {accepting ? 'Processing…' : '✓ Confirm & Accept'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Decline reason modal ── */}
      {declineModal && (
        <Modal onClose={() => setDeclineModal(false)}>
          <div style={{ padding: 32, maxWidth: 460 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✕</div>
            <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Decline Quote?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 16 }}>
              Record the reason this quote was declined. This helps track win/loss patterns.
            </p>
            <textarea
              value={form.declineReason}
              onChange={(e) => set('declineReason', e.target.value)}
              rows={4}
              placeholder="e.g. Price too high, went with competitor, project cancelled..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6, color: '#fff', fontSize: 13, padding: '10px 12px',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setDeclineModal(false)} style={btnStyle('ghost')}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeclineModal(false)
                  await handleSave('declined')
                }}
                style={{ ...btnStyle('secondary'), borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: 'rgba(239,68,68,0.9)' }}
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Accept success modal ── */}
      {acceptResult && (
        <Modal onClose={() => setAcceptResult(null)}>
          <div style={{ padding: 32, maxWidth: 460 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Quote Accepted!
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 20 }}>
              {acceptResult.isExisting ? (
                <>Quote linked to existing job <strong style={{ color: '#E8681A', fontSize: 16 }}>{acceptResult.jobNum}</strong>.</>
              ) : acceptResult.pairedJobNum ? (
                <>
                  Two jobs created on the Production Board at <strong style={{ color: '#fff' }}>Requires Engineering</strong>:<br />
                  <span style={{ display: 'inline-block', marginTop: 6 }}>
                    🚛 Truck body — <strong style={{ color: '#E8681A', fontSize: 16 }}>{acceptResult.jobNum}</strong><br />
                    🚚 Trailer — <strong style={{ color: '#E8681A', fontSize: 16 }}>{acceptResult.pairedJobNum}</strong>
                  </span>
                </>
              ) : (
                <>Job <strong style={{ color: '#E8681A', fontSize: 16 }}>{acceptResult.jobNum}</strong> has been created on the Production Board at{' '}<strong style={{ color: '#fff' }}>Requires Engineering</strong>.</>
              )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                onClick={() => { setAcceptResult(null); router.push('/jobboard') }}
                style={btnStyle('primary')}
              >
                View Job Board
              </button>
              <button
                onClick={() => { setAcceptResult(null); window.open(`/qsheet/${savedId}`, '_blank') }}
                style={btnStyle('ghost')}
              >
                📋 Print Job Sheet
              </button>
              <button onClick={() => setAcceptResult(null)} style={btnStyle('ghost')}>
                Stay Here
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#111', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {children}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children, style }: { title: string; icon: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: 24, ...style,
    }}>
      <div style={{
        fontFamily: "'League Spartan', sans-serif",
        fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.5)', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{icon}</span> {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6, display: 'block' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TotalRow({ label, value, large, accent }: { label: string; value: string; large?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: large ? 13 : 12, fontWeight: large ? 700 : 400, color: large ? '#fff' : 'rgba(255,255,255,0.4)', textTransform: large ? 'uppercase' : 'none', letterSpacing: large ? 0.5 : 0 }}>
        {label}
      </span>
      <span style={{ fontSize: large ? 20 : 13, fontWeight: large ? 800 : 500, color: accent ? '#f59e0b' : large ? '#fff' : 'rgba(255,255,255,0.7)', fontFamily: large ? "'League Spartan', sans-serif" : 'inherit' }}>
        {value}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' },
    sent: { bg: 'rgba(59,130,246,0.15)', text: 'rgba(59,130,246,0.9)' },
    accepted: { bg: 'rgba(34,197,94,0.15)', text: 'rgba(34,197,94,0.9)' },
    declined: { bg: 'rgba(239,68,68,0.15)', text: 'rgba(239,68,68,0.9)' },
    expired: { bg: 'rgba(234,179,8,0.15)', text: 'rgba(234,179,8,0.9)' },
  }
  const c = colors[status] || colors.draft
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 4, background: c.bg, color: c.text,
    }}>
      {status}
    </span>
  )
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '9px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 32,
}

function grid(cols: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
  }
}

function btnStyle(variant: 'primary' | 'secondary' | 'ghost'): React.CSSProperties {
  if (variant === 'primary') return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
    border: 'none', background: '#E8681A', color: '#fff',
  }
  if (variant === 'secondary') return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: 'rgba(59,130,246,0.9)',
  }
  return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    padding: '10px 24px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)',
  }
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function QuoteBuilderPage() {
  return (
    <Suspense>
      <QuoteBuilderInner />
    </Suspense>
  )
}
