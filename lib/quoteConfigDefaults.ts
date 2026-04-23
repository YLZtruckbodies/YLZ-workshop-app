// Default values the quote builder falls back to when the stored configuration
// is missing a field. Quotes saved before a field existed in the builder don't
// have these keys in their configuration JSON, which leaves the job sheet blank.
// Applying these defaults on read makes the job sheet match what the builder
// displays without having to re-save old quotes.

const TRUCK_BODY_DEFAULTS: Record<string, string> = {
  pivotCentre: '235',
  tailgateType: 'Single Drop',
  tailgateLights: 'None',
  tailLights: 'Use existing OEM tail lights',
  sideLights: 'None',
  indicators: 'None',
  antiSpray: 'No',
  shovelHolder: 'No',
  mudflaps: 'None',
  grainDoors: 'No',
  grainLocks: 'No',
  reverseBuzzer: 'None',
  bodySpigot: 'No',
  rockSheet: 'No',
  liner: 'No',
  pto: 'None',
  pump: 'None',
  hydTankType: 'Factory supplied',
  hydTankLocation: 'Centre Front of Subframe',
  hoseBurstValve: 'No',
  chassisExtension: 'No',
  brakeCoupling: 'Duomatic',
  ladderType: '3-Step Pull out ladder c/w rungs',
  ladderPosition: 'Driverside Front',
  spreaderChain: 'No',
  pushLugs: 'No',
  catMarkers: 'Yes',
  camera: 'No',
  vibrator: 'No',
  tarpColour: 'Black',
}

const TRAILER_DEFAULTS: Record<string, string> = {
  tarpColour: 'Black',
}

function fillDefaults(target: Record<string, any>, defaults: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = { ...target }
  for (const [k, v] of Object.entries(defaults)) {
    if (out[k] == null || out[k] === '') out[k] = v
  }
  return out
}

export function applyConfigDefaults(cfg: any, buildType: string | null | undefined): any {
  if (!cfg || typeof cfg !== 'object') return cfg
  // The DB stores buildType in a handful of forms: the form-code form
  // ("truck-body", "truck-and-trailer"), the capitalised display form
  // ("Truck Body", "Truck + Trailer"), and legacy variants. Normalise to
  // a comparable shape by stripping everything except letters.
  const bt = (buildType || '').toLowerCase().replace(/[^a-z]/g, '')
  const hasTruck = bt.includes('truck') || bt === 'body' || bt === 'truckbody'
  const hasTrailer = bt.includes('trailer')

  if (hasTruck && hasTrailer) {
    const filled = { ...cfg }
    if (filled.truckConfig && typeof filled.truckConfig === 'object') {
      filled.truckConfig = fillDefaults(filled.truckConfig, TRUCK_BODY_DEFAULTS)
    }
    if (filled.trailerConfig && typeof filled.trailerConfig === 'object') {
      filled.trailerConfig = fillDefaults(filled.trailerConfig, TRAILER_DEFAULTS)
    }
    // Truck-and-trailer quotes without nested configs — fall back to
    // filling defaults at the top level so any reader still resolves them.
    if (!filled.truckConfig && !filled.trailerConfig) {
      return fillDefaults(filled, { ...TRUCK_BODY_DEFAULTS, ...TRAILER_DEFAULTS })
    }
    return filled
  }

  if (hasTruck) {
    return fillDefaults(cfg, TRUCK_BODY_DEFAULTS)
  }

  if (hasTrailer) {
    return fillDefaults(cfg, TRAILER_DEFAULTS)
  }

  return cfg
}
