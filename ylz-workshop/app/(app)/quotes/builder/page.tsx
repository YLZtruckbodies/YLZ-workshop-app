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
  truckFloorSheet: string
  truckSideSheet: string
  truckHoist: string
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
  trailerTarp: string
  trailerPbs: string
  // engineering details — truck
  chassisMake: string
  chassisModel: string
  truckBodyLength: string
  truckBodyWidth: string
  truckBodyHeight: string
  truckBodyCapacity: string
  truckGvm: string
  truckTare: string
  truckPaintColour: string
  // engineering details — trailer
  trailerBodyLength: string
  trailerBodyWidth: string
  trailerBodyHeight: string
  trailerBodyCapacity: string
  trailerGtm: string
  trailerGcm: string
  trailerTare: string
  trailerPaintColour: string
  // shared engineering
  specialRequirements: string
  // engineering extras — truck
  truckSerial: string
  truckVin: string
  truckMainRunnerWidth: string
  truckTailgateType: string
  truckTailgateLights: string
  truckPto: string
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
  trailerDrawbarLength: string
  trailerMainRunnerWidth: string
  trailerChassisLength: string
  trailerWheelbase: string
  trailerTailgateLights: string
  trailerLockFlap: string
  // truck body extras
  truckBrakeCoupling: string
  truckLadderType: string
  truckLadderPosition: string
  truckSpreaderChain: string
  truckCatMarkers: string
  truckReflectors: string
  truckCamera: string
  truckVibrator: string
  // tarp breakdown (replaces single truckTarp dropdown in UI)
  truckTarpMaterial: string
  truckTarpColour: string
  truckTarpType: string
  truckTarpBowSize: string
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
}

// ─── Options ──────────────────────────────────────────────────────────────────

const MATERIALS = ['Hardox 500', 'Aluminium', 'Hardox 450', 'Steel']
const HOISTS = ['Binotto 3190', 'Hyva Alpha 092', 'Hyva Alpha 190', 'PH122 Kröger', 'None']
const TARPS = [
  'Razor PVC Electric', 'Razor PVC Manual',
  'Razor Mesh Electric', 'Razor Mesh Manual',
  'EziTarp Electric', 'Pulltarp Manual', 'None',
]
const COUPLINGS = ['V.Orlandi', 'Bartlett Ball 127mm', 'Pintle Hook PH300 with Air Cushion', 'None']
const CONTROLS = ['Electric hand controller', 'In-cab controller', 'None']
const HYDRAULICS = ['Use Existing', 'Split Factory Tank', 'Behind Cab', 'Chassis Mounted', 'None']
const PTO_OPTIONS = ['None', 'Gearbox PTO', 'Engine PTO', 'Customer Supplied']
const TAILGATE_TYPES = ['Fixed', '2 Way', 'Single Drop', 'Bi-fold', 'No Tailgate']
const TAILGATE_LIGHTS = ['None', '4 Per Side Round LED', 'LED Strip', 'LED Cluster', 'Reverse Light Only', 'Other']
const HYD_TANK_TYPES = ['Split & Supply Tank', 'Separate Tank', 'Customer Supplied', 'None']
const HYD_TANK_LOCATIONS = ['Behind Cab', 'Under Body', 'Sub-frame Mounted', 'Other']
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
const TARP_STYLES = ['Razor Electric', 'Roll Rite', 'EziTarp Electric', 'Pulltarp Manual', 'Other']
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
  if (coupling.toLowerCase().includes('pintle')) return '8.1T Vertical Load'
  if (coupling === 'V.Orlandi' || coupling.toLowerCase().includes('bartlett') || coupling === 'Ringfeder') return '2.5T Vertical Load'
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
const SUSPENSIONS = ['SAF Air Ride', 'Mechanical', 'Rubber']
const BUILD_TYPES = [
  { value: 'truck-body', label: '🚛 Truck Body' },
  { value: 'trailer', label: '🚜 Trailer' },
  { value: 'truck-and-trailer', label: '🚛🚜 Truck + Trailer' },
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
  if (material === 'Aluminium') return { floor: '5mm Aluminium', side: '5mm Aluminium' }
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
  const W = form.truckBodyWidth  ? fmtDim(form.truckBodyWidth)  : '—'
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
  lines.push(`${isAlloy ? 'Aluminium' : form.truckMaterial} truck body ${L}L x ${W}W x ${H}H mm (Internal)`)
  if (form.truckBodyCapacity) lines.push(`Body capacity: ${form.truckBodyCapacity}m³`)
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
    if (form.truckTarpBowSize) tarpParts.push(`${form.truckTarpBowSize} bow`)
    if (form.truckTarpLocation) tarpParts.push(form.truckTarpLocation)
    lines.push(`Tarp: ${tarpParts.join(' — ')}`)
  }
  // Ladder
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
  lines.push('LED lighting throughout')
  if (form.truckPaintColour) lines.push(`Paint: ${form.truckPaintColour}`)

  // Trim trailing blank lines
  while (lines[lines.length - 1] === '') lines.pop()
  return lines.join('\n')
}

function generateTrailerSpec(form: QuoteForm): string {
  const isAlloy = form.trailerMaterial === 'Aluminium'
  const axleCount = form.trailerAxleCount
  const L = form.trailerBodyLength ? fmtDim(form.trailerBodyLength) : '—'
  const W = form.trailerBodyWidth  ? fmtDim(form.trailerBodyWidth)  : '—'
  const H = form.trailerBodyHeight ? fmtDim(form.trailerBodyHeight) : '—'
  const axleTypeLabel = form.trailerAxleType === 'Drum or Disc (customer choice)' ? 'Drum or Disc' : form.trailerAxleType

  const lines: string[] = []
  lines.push('SERIAL:')
  lines.push('VIN:')
  lines.push('')
  lines.push(`${axleCount}-axle Dog Trailer ${L}L x ${W}W x ${H}H mm (Internal)`)
  if (form.trailerBodyCapacity) lines.push(`Body capacity: ${form.trailerBodyCapacity}m³`)
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
  lines.push('Alcoa Dura-Bright aluminium wheels')
  lines.push('ST315/80R22.5 tyres')
  lines.push('')
  if (form.trailerTarp !== 'None') lines.push(`${form.trailerTarp} tarp system`)
  lines.push('LED lighting throughout')
  if (form.trailerPaintColour) lines.push(`Paint: ${form.trailerPaintColour}`)
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
    truckFloorSheet: '6mm Hardox 500',
    truckSideSheet: '5mm Hardox 500',
    truckHoist: 'Binotto 3190',
    truckTarp: 'Razor PVC/MESH Electric',
    truckCoupling: 'V.Orlandi',
    truckControls: 'Electric hand controller',
    truckHydraulics: 'Split & supply hydraulic tank',
    trailerModel: 'DT-4 (4-Axle Dog)',
    trailerType: 'P Beam',
    trailerMaterial: 'Aluminium',
    trailerAxleMake: 'SAF',
    trailerAxleCount: 4,
    trailerAxleType: 'Drum or Disc (customer choice)',
    trailerSuspension: 'SAF Air Ride',
    trailerTarp: 'Razor PVC/MESH Electric',
    trailerPbs: '',
    chassisMake: '', chassisModel: '',
    truckBodyLength: '', truckBodyWidth: '', truckBodyHeight: '',
    truckBodyCapacity: '', truckGvm: '', truckTare: '', truckPaintColour: '',
    trailerBodyLength: '', trailerBodyWidth: '', trailerBodyHeight: '',
    trailerBodyCapacity: '', trailerGtm: '', trailerGcm: '',
    trailerTare: '', trailerPaintColour: '',
    specialRequirements: '',
    truckSerial: '', truckVin: '', truckMainRunnerWidth: '',
    truckTailgateType: 'Single Drop', truckTailgateLights: 'None',
    truckPto: 'None', truckHydTankType: 'Split & Supply Tank',
    truckHydTankLocation: 'Behind Cab', truckDValue: '', truckCouplingLoad: '',
    truckBrakeCoupling: 'Duomatic',
    truckLadderType: '3-Step Pull out ladder c/w rungs',
    truckLadderPosition: 'Driverside Front',
    truckSpreaderChain: 'No',
    truckCatMarkers: 'Yes',
    truckReflectors: '',
    truckCamera: 'No',
    truckVibrator: 'No',
    truckTarpMaterial: 'PVC',
    truckTarpColour: '',
    truckTarpType: 'Hoop Type',
    truckTarpBowSize: '',
    truckTarpStyle: 'Razor Electric',
    truckTarpLocation: 'Standard Out Front',
    trailerSerial: '', trailerVin: '', trailerFloorSheet: '', trailerSideSheet: '',
    trailerHoist: '', trailerDrawbarLength: '', trailerMainRunnerWidth: '',
    trailerChassisLength: '', trailerWheelbase: '',
    trailerTailgateLights: 'None', trailerLockFlap: 'No',
    lineItems: [],
    margin: 0, overhead: 0, discount: 0,
    useOverride: false, overridePrice: '', overrideNote: '',
    notes: '', terms: DEFAULT_TERMS,
    declineReason: '',
  }
}

function applyTemplateConfig(form: QuoteForm, cfg: Record<string, any>, template?: any) {
  form.buildType = cfg.buildType || form.buildType

  if (form.buildType === 'truck-and-trailer') {
    const tc = cfg.truckConfig || {}
    const trc = cfg.trailerConfig || {}
    if (tc.material) form.truckMaterial = tc.material
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
    if (trc.suspension) form.trailerSuspension = trc.suspension
    if (trc.tarpSystem) form.trailerTarp = trc.tarpSystem
    form.trailerPbs = cfg.pbsRating || trc.pbsRating || ''

    // Engineering details (truck)
    form.chassisMake = tc.chassisMake || ''
    form.chassisModel = tc.chassisModel || ''
    form.truckBodyLength = tc.bodyLength || ''
    form.truckBodyWidth = tc.bodyWidth || ''
    form.truckBodyHeight = tc.bodyHeight || ''
    form.truckBodyCapacity = tc.bodyCapacity || ''
    form.truckGvm = tc.gvm || ''
    form.truckTare = tc.tare || ''
    form.truckPaintColour = tc.paintColour || ''
    form.truckSerial = tc.serial || ''
    form.truckVin = tc.vin || ''
    form.truckMainRunnerWidth = tc.mainRunnerWidth || ''
    form.truckTailgateType = tc.tailgateType || 'Single Drop'
    form.truckTailgateLights = tc.tailgateLights || 'None'
    form.truckPto = tc.pto || 'None'
    form.truckHydTankType = tc.hydTankType || 'Split & Supply Tank'
    form.truckHydTankLocation = tc.hydTankLocation || 'Behind Cab'
    form.truckDValue = tc.dValue || ''
    form.truckCouplingLoad = tc.couplingLoad || getCouplingLoad(form.truckCoupling)
    // Engineering details (trailer)
    form.trailerBodyLength = trc.bodyLength || ''
    form.trailerBodyWidth = trc.bodyWidth || ''
    form.trailerBodyHeight = trc.bodyHeight || ''
    form.trailerBodyCapacity = trc.bodyCapacity || ''
    form.trailerGtm = trc.gtm || ''
    form.trailerGcm = trc.gcm || ''
    form.trailerTare = trc.tare || ''
    form.trailerPaintColour = trc.paintColour || ''
    form.trailerSerial = trc.serial || ''
    form.trailerVin = trc.vin || ''
    form.trailerFloorSheet = trc.floorSheet || ''
    form.trailerSideSheet = trc.sideSheet || ''
    form.trailerHoist = trc.hoist || ''
    form.trailerDrawbarLength = trc.drawbarLength || ''
    form.trailerMainRunnerWidth = trc.mainRunnerWidth || ''
    form.trailerChassisLength = trc.chassisLength || getChassisLength(trc.bodyLength || '')
    form.trailerWheelbase = trc.wheelbase || ''
    form.trailerTailgateLights = trc.tailgateLights || 'None'
    form.trailerLockFlap = trc.lockFlap || 'No'
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
    form.truckBodyLength = cfg.bodyLength || ''
    form.truckBodyWidth = cfg.bodyWidth || ''
    form.truckBodyHeight = cfg.bodyHeight || ''
    form.truckBodyCapacity = cfg.bodyCapacity || ''
    form.truckGvm = cfg.gvm || ''
    form.truckTare = cfg.tare || ''
    form.truckPaintColour = cfg.paintColour || ''
    form.truckSerial = cfg.serial || ''
    form.truckVin = cfg.vin || ''
    form.truckMainRunnerWidth = cfg.mainRunnerWidth || ''
    form.truckTailgateType = cfg.tailgateType || 'Single Drop'
    form.truckTailgateLights = cfg.tailgateLights || 'None'
    form.truckPto = cfg.pto || 'None'
    form.truckHydTankType = cfg.hydTankType || 'Split & Supply Tank'
    form.truckHydTankLocation = cfg.hydTankLocation || 'Behind Cab'
    form.truckDValue = cfg.dValue || ''
    form.truckCouplingLoad = cfg.couplingLoad || getCouplingLoad(form.truckCoupling)
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
    if (cfg.suspension) form.trailerSuspension = cfg.suspension
    if (cfg.tarpSystem) form.trailerTarp = cfg.tarpSystem
    form.trailerPbs = cfg.pbsRating || ''
    form.trailerBodyLength = cfg.bodyLength || ''
    form.trailerBodyWidth = cfg.bodyWidth || ''
    form.trailerBodyHeight = cfg.bodyHeight || ''
    form.trailerBodyCapacity = cfg.bodyCapacity || ''
    form.trailerGtm = cfg.gtm || ''
    form.trailerGcm = cfg.gcm || ''
    form.trailerTare = cfg.tare || ''
    form.trailerPaintColour = cfg.paintColour || ''
    form.trailerSerial = cfg.serial || ''
    form.trailerVin = cfg.vin || ''
    form.trailerFloorSheet = cfg.floorSheet || ''
    form.trailerSideSheet = cfg.sideSheet || ''
    form.trailerHoist = cfg.hoist || ''
    form.trailerDrawbarLength = cfg.drawbarLength || ''
    form.trailerMainRunnerWidth = cfg.mainRunnerWidth || ''
    form.trailerChassisLength = cfg.chassisLength || getChassisLength(cfg.bodyLength || '')
    form.trailerWheelbase = cfg.wheelbase || ''
    form.trailerTailgateLights = cfg.tailgateLights || 'None'
    form.trailerLockFlap = cfg.lockFlap || 'No'
    form.specialRequirements = cfg.specialRequirements || ''

    if (cfg.templateType === 'quick-quote' && template?.basePrice > 0) {
      form.lineItems = [{ section: 'Build', description: template.name, quantity: 1, unitPrice: template.basePrice, totalPrice: template.basePrice, sortOrder: 0 }]
    }
  }
}

function buildConfiguration(form: QuoteForm): Record<string, unknown> {
  const cfg: Record<string, unknown> = { buildType: form.buildType }
  const truckData = {
    material: form.truckMaterial, floorSheet: form.truckFloorSheet,
    sideSheet: form.truckSideSheet,
    hoist: form.truckHoist,
    tarpSystem: form.truckTarp, coupling: form.truckCoupling,
    controls: form.truckControls, hydraulics: form.truckHydraulics,
    chassisMake: form.chassisMake, chassisModel: form.chassisModel,
    bodyLength: form.truckBodyLength, bodyWidth: form.truckBodyWidth,
    bodyHeight: form.truckBodyHeight, bodyCapacity: form.truckBodyCapacity,
    gvm: form.truckGvm, tare: form.truckTare, paintColour: form.truckPaintColour,
    serial: form.truckSerial, vin: form.truckVin,
    mainRunnerWidth: form.truckMainRunnerWidth,
    tailgateType: form.truckTailgateType, tailgateLights: form.truckTailgateLights,
    pto: form.truckPto, hydTankType: form.truckHydTankType,
    hydTankLocation: form.truckHydTankLocation,
    dValue: form.truckDValue, couplingLoad: form.truckCouplingLoad,
  }
  const trailerData = {
    trailerModel: form.trailerModel, trailerType: form.trailerType,
    material: form.trailerMaterial, axleMake: form.trailerAxleMake,
    axleCount: form.trailerAxleCount, axleType: form.trailerAxleType,
    suspension: form.trailerSuspension, tarpSystem: form.trailerTarp,
    pbsRating: form.trailerPbs,
    floorSheet: form.trailerFloorSheet, sideSheet: form.trailerSideSheet,
    hoist: form.trailerHoist, drawbarLength: form.trailerDrawbarLength,
    bodyLength: form.trailerBodyLength, bodyWidth: form.trailerBodyWidth,
    bodyHeight: form.trailerBodyHeight, bodyCapacity: form.trailerBodyCapacity,
    gtm: form.trailerGtm, gcm: form.trailerGcm,
    tare: form.trailerTare, paintColour: form.trailerPaintColour,
    serial: form.trailerSerial, vin: form.trailerVin,
    mainRunnerWidth: form.trailerMainRunnerWidth,
    chassisLength: form.trailerChassisLength, wheelbase: form.trailerWheelbase,
    tailgateLights: form.trailerTailgateLights, lockFlap: form.trailerLockFlap,
  }
  if (form.buildType === 'truck-and-trailer') {
    cfg.truckConfig = truckData
    cfg.trailerConfig = trailerData
    cfg.pbsRating = form.trailerPbs
    cfg.specialRequirements = form.specialRequirements
  } else if (form.buildType === 'truck-body') {
    Object.assign(cfg, truckData)
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
  const { data: session } = useSession()

  const [form, setForm] = useState<QuoteForm>(emptyForm())
  const [savedId, setSavedId] = useState<string | null>(quoteId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [acceptModal, setAcceptModal] = useState(false)
  const [acceptMode, setAcceptMode] = useState<'new' | 'existing'>('new')
  const [existingJobNum, setExistingJobNum] = useState('')
  const [acceptResult, setAcceptResult] = useState<{ jobNum: string; jobId: string; isExisting?: boolean } | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isQuickQuote, setIsQuickQuote] = useState(false)
  const [declineModal, setDeclineModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [specWarning, setSpecWarning] = useState<string | null>(null)
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([])
  const [dealerSuggestions, setDealerSuggestions] = useState<string[]>([])

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
          f.lineItems = quote.lineItems || []
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
  }, [quoteId, templateId])

  // Auto-set preparedBy from session once loaded
  useEffect(() => {
    if (session?.user?.name && !form.preparedBy) {
      setForm((f) => ({ ...f, preparedBy: session!.user!.name as string }))
    }
  }, [session])

  // Auto-calculate trailer chassis length from body length
  useEffect(() => {
    const calc = getChassisLength(form.trailerBodyLength)
    if (calc) setForm((f) => ({ ...f, trailerChassisLength: calc }))
  }, [form.trailerBodyLength])

  // Auto-set coupling load from coupling selection
  useEffect(() => {
    setForm((f) => ({ ...f, truckCouplingLoad: getCouplingLoad(f.truckCoupling) }))
  }, [form.truckCoupling])

  // ── Field update helpers ──────────────────────────────────────────────────

  const set = useCallback((key: keyof QuoteForm, val: any) => {
    setForm((f) => ({ ...f, [key]: val }))
  }, [])

  function onMaterialChange(material: string) {
    const sheets = defaultSheets(material)
    const isHardox = material.startsWith('Hardox')
    setForm((f) => ({
      ...f,
      truckMaterial: material,
      truckFloorSheet: sheets.floor,
      truckSideSheet: sheets.side,
      // Auto-default ladder for Hardox builds
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
        setForm((f) => ({ ...f, status: 'accepted' }))
        setAcceptResult({ jobNum: data.job.num, jobId: data.job.id, isExisting: data.isExisting })
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
              onClick={() => { setAcceptMode('new'); setExistingJobNum(''); setAcceptModal(true) }}
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
            {/* Row 1: Material + sheets */}
            <div style={grid(3)}>
              <Field label="Body Material">
                <select value={form.truckMaterial} onChange={(e) => onMaterialChange(e.target.value)} style={selectStyle}>
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
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
                  {HYDRAULICS.map((h) => <option key={h}>{h}</option>)}
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
              <Field label="Bow Size">
                <input value={form.truckTarpBowSize} onChange={(e) => set('truckTarpBowSize', e.target.value)} placeholder="e.g. 50mm" style={inputStyle} />
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
            <div style={{ ...grid(4), marginTop: 16 }}>
              <Field label="Axle Make">
                <select value={form.trailerAxleMake} onChange={(e) => set('trailerAxleMake', e.target.value)} style={selectStyle}>
                  {AXLE_MAKES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Axle Count">
                <input type="number" value={form.trailerAxleCount} onChange={(e) => set('trailerAxleCount', parseInt(e.target.value) || 4)} style={inputStyle} min={2} max={6} />
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
            </div>
            <div style={{ ...grid(4), marginTop: 16 }}>
              <Field label="Floor Sheet">
                <input value={form.trailerFloorSheet} onChange={(e) => set('trailerFloorSheet', e.target.value)} placeholder="e.g. 8mm Aluminium" style={inputStyle} />
              </Field>
              <Field label="Side Sheet">
                <input value={form.trailerSideSheet} onChange={(e) => set('trailerSideSheet', e.target.value)} placeholder="e.g. 5mm Aluminium" style={inputStyle} />
              </Field>
              <Field label="Hoist Model">
                <input value={form.trailerHoist} onChange={(e) => set('trailerHoist', e.target.value)} placeholder="e.g. Binotto 4-stage" style={inputStyle} />
              </Field>
              <Field label="PBS Rating">
                <input value={form.trailerPbs} onChange={(e) => set('trailerPbs', e.target.value)} placeholder="e.g. 56.5T GCM" style={inputStyle} />
              </Field>
            </div>
            <div style={{ ...grid(2), marginTop: 16 }}>
              <Field label="Tarp System">
                <select value={form.trailerTarp} onChange={(e) => set('trailerTarp', e.target.value)} style={selectStyle}>
                  {TARPS.map((t) => <option key={t}>{t}</option>)}
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
              <div style={grid(4)}>
                <Field label="Chassis Make">
                  <input value={form.chassisMake} onChange={(e) => set('chassisMake', e.target.value)} placeholder="e.g. Hino" style={inputStyle} />
                </Field>
                <Field label="Chassis Model">
                  <input value={form.chassisModel} onChange={(e) => set('chassisModel', e.target.value)} placeholder="e.g. 500 Series" style={inputStyle} />
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
                  <input value={form.truckBodyWidth} onChange={(e) => set('truckBodyWidth', e.target.value)} placeholder="e.g. 2250" style={inputStyle} />
                </Field>
                <Field label="Main Runner Width (mm)">
                  <input value={form.truckMainRunnerWidth} onChange={(e) => set('truckMainRunnerWidth', e.target.value)} placeholder="e.g. 820" style={inputStyle} />
                </Field>
                <Field label="Body Height (mm)">
                  <input value={form.truckBodyHeight} onChange={(e) => set('truckBodyHeight', e.target.value)} placeholder="e.g. 1200" style={inputStyle} />
                </Field>
                <Field label="Capacity (m³)">
                  <input value={form.truckBodyCapacity} onChange={(e) => set('truckBodyCapacity', e.target.value)} placeholder="e.g. 10" style={inputStyle} />
                </Field>
                <Field label="Tare Estimate (kg)">
                  <input value={form.truckTare} onChange={(e) => set('truckTare', e.target.value)} placeholder="e.g. 3200" style={inputStyle} />
                </Field>
              </div>
              {/* Row 3: weight + paint */}
              <div style={{ ...grid(4), marginTop: 16 }}>
                <Field label="GVM (kg)">
                  <input value={form.truckGvm} onChange={(e) => set('truckGvm', e.target.value)} placeholder="e.g. 25000" style={inputStyle} />
                </Field>
                <Field label="Paint Colour">
                  <input value={form.truckPaintColour} onChange={(e) => set('truckPaintColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
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
              <div style={{ ...grid(3), marginTop: 16 }}>
                <Field label="PTO">
                  <select value={form.truckPto} onChange={(e) => set('truckPto', e.target.value)} style={selectStyle}>
                    {PTO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
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
                  <input value={form.trailerVin} onChange={(e) => set('trailerVin', e.target.value)} placeholder="17-char VIN" style={inputStyle} />
                </Field>
                <Field label="Paint Colour">
                  <input value={form.trailerPaintColour} onChange={(e) => set('trailerPaintColour', e.target.value)} placeholder="e.g. Gloss Black" style={inputStyle} />
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
                  <input value={form.trailerBodyLength} onChange={(e) => set('trailerBodyLength', e.target.value)} placeholder="e.g. 8300" style={inputStyle} />
                </Field>
                <Field label="Body Width (mm)">
                  <input value={form.trailerBodyWidth} onChange={(e) => set('trailerBodyWidth', e.target.value)} placeholder="e.g. 2250" style={inputStyle} />
                </Field>
                <Field label="Main Runner Width (mm)">
                  <input value={form.trailerMainRunnerWidth} onChange={(e) => set('trailerMainRunnerWidth', e.target.value)} placeholder="e.g. 820" style={inputStyle} />
                </Field>
                <Field label="Body Height (mm)">
                  <input value={form.trailerBodyHeight} onChange={(e) => set('trailerBodyHeight', e.target.value)} placeholder="e.g. 1100" style={inputStyle} />
                </Field>
                <Field label="Capacity (m³)">
                  <input value={form.trailerBodyCapacity} onChange={(e) => set('trailerBodyCapacity', e.target.value)} placeholder="e.g. 14" style={inputStyle} />
                </Field>
              </div>
              {/* Row 4: chassis dimensions */}
              <div style={{ ...grid(3), marginTop: 16 }}>
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
              </div>
              {/* Row 5: lighting + lock flap */}
              <div style={{ ...grid(2), marginTop: 16 }}>
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
                  if (!form.truckBodyWidth)  missing.push('Truck Body Width')
                  if (!form.chassisMake)     missing.push('Chassis Make/Model')
                }
                if (hasTrl) {
                  if (!form.trailerBodyLength) missing.push('Trailer Body Length')
                  if (!form.trailerBodyWidth)  missing.push('Trailer Body Width')
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
                incl. GST: ${fmt(effectiveTotal * 1.1)}
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
              {acceptMode === 'existing' && (
                <div>
                  <input
                    autoFocus
                    value={existingJobNum}
                    onChange={(e) => setExistingJobNum(e.target.value.toUpperCase())}
                    placeholder="e.g. YLZ 1050"
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
                  <li>Create a new Job on the Production Board</li>
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
