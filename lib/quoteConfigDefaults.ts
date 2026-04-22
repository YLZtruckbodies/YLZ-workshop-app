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
  const bt = (buildType || '').toLowerCase()

  if (bt === 'truck-body') {
    return fillDefaults(cfg, TRUCK_BODY_DEFAULTS)
  }

  if (bt === 'truck-and-trailer') {
    const filled = { ...cfg }
    if (filled.truckConfig && typeof filled.truckConfig === 'object') {
      filled.truckConfig = fillDefaults(filled.truckConfig, TRUCK_BODY_DEFAULTS)
    }
    return filled
  }

  return cfg
}
