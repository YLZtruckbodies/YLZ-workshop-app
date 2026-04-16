// ─────────────────────────────────────────────────────────────────────────────
// YLZ Workshop — BOM Resolver
// Takes a quote configuration and returns the list of MRPeasy BOMs/parts needed.
// Pure function — no DB calls, no side effects. Fully testable.
// ─────────────────────────────────────────────────────────────────────────────

import { BOM_CATALOG } from './bom-catalog'

export interface BomEntry {
  code: string
  name: string
  category: string
  section: string   // Which part of the build this covers (e.g. "Truck Body", "Running Gear")
  auto: boolean     // true = auto-resolved, false = manually added
  note?: string     // Optional extra info (e.g. tarp length)
}

// ─── PTO Lookup: Chassis Make → PTO Part ─────────────────────────────────────
// The gearbox type determines which PTO is needed. TES always supplies.
const PTO_MAP: { match: string[]; part: string; note?: string }[] = [
  { match: ['mercedes', 'merc', 'actros', 'arocs', 'atego'],   part: '500-123', note: 'Mercedes G230-12 via TES' },
  { match: ['volvo', 'fm', 'fh', 'fmx'],                       part: '500-251', note: 'Volvo OMFB VOL024ISO' },
  { match: ['kenworth', 'kw', 't410', 't610', 't360'],          part: '500-214', note: 'Paccar TX18 Hydreco' },
  { match: ['daf', 'cf', 'xf'],                                 part: '500-214', note: 'Paccar TX18 (same as Kenworth)' },
  { match: ['iveco', 'stralis', 'eurotech', 'trakker'],         part: '500-24',  note: 'ZF OMFB + 500-23 loom kit' },
  { match: ['mack', 'granite', 'trident', 'superliner'],        part: '500-24',  note: 'Mack mDRIVE (ZF variant)' },
  { match: ['ud', 'quon', 'quester'],                            part: '500-136', note: 'ZF/Eaton PZB3B' },
  { match: ['hino', '500', '700'],                               part: '500-24',  note: 'Hino ZF — confirm with TES' },
  { match: ['isuzu', 'fvz', 'fvr', 'giga'],                    part: '500-24',  note: 'Isuzu ZF — confirm with TES' },
  { match: ['fuso', 'shogun', 'fighter'],                        part: '500-24',  note: 'Fuso ZF — confirm with TES' },
]

function resolvePto(chassisMake: string, chassisModel: string): { part: string; note: string } | null {
  const search = `${chassisMake} ${chassisModel}`.toLowerCase()
  for (const entry of PTO_MAP) {
    if (entry.match.some(m => search.includes(m))) {
      return { part: entry.part, note: entry.note || '' }
    }
  }
  return null
}

// ─── Hoist Lookup: Quote dropdown → MRPeasy Part ─────────────────────────────
const HOIST_MAP: Record<string, string> = {
  'binotto 3190':           '500-236',
  'hyva alpha 092':         '500-83',
  'hyva alpha 190':         '500-87',
  // MFB part number variants (auto-populated from body length lookup)
  'mfb3126.3.2840':         '500-207',
  'mfb3126.3.3190':         '500-236',
  'mfb3126.3.2960':         'TBC-2960',
  'mfb3128.3.2960':         'TBC-2960',
  'mfb3128.3.3190':         '500-236',
  'mfb3126.4.3310':         '500-237',
  'mfb3126.4.3450':         '500-237',
  'mfcb3126.4.3805':        '500-47',
  'hpf3070-135-3-s3':       'TBC-HPF3070',
  // PH122 Kröger not in MRPeasy — will flag as TBD
}

function resolveHoist(hoistName: string): string | null {
  const key = hoistName.toLowerCase().trim()
  return HOIST_MAP[key] || null
}

// ─── Tarp Size Lookup ────────────────────────────────────────────────────────
const TARP_RANGES: [number, number, string, string][] = [
  [0,    4350, 'BOM124', 'BOM131'],
  [4351, 5200, 'BOM125', 'BOM132'],
  [5201, 6050, 'BOM126', 'BOM133'],
  [6051, 6950, 'BOM127', 'BOM134'],
  [6951, 7800, 'BOM128', 'BOM135'],
  [7801, 8650, 'BOM129', 'BOM136'],
  [8651, 9550, 'BOM130', 'BOM137'],
]

function resolveTarpBom(isPVC: boolean, bodyLengthMm: number): string | null {
  for (const [min, max, pvc, mesh] of TARP_RANGES) {
    if (bodyLengthMm >= min && bodyLengthMm <= max) {
      return isPVC ? pvc : mesh
    }
  }
  return null
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

export function resolveBoms(
  buildType: string,
  config: Record<string, unknown>
): BomEntry[] {
  const boms: BomEntry[] = []
  const added = new Set<string>()

  // Add a BOM/part to the list (deduped)
  function add(code: string, section: string, note?: string) {
    if (added.has(code)) return
    added.add(code)
    const info = BOM_CATALOG[code]
    boms.push({
      code,
      name: info?.name ?? code,
      category: info?.category ?? 'Unknown',
      section,
      auto: true,
      ...(note ? { note } : {}),
    })
  }

  // Add a TBD placeholder (for items the resolver can't auto-detect)
  function addTbd(section: string, description: string) {
    boms.push({
      code: `TBD`,
      name: description,
      category: 'TBD',
      section,
      auto: true,
    })
  }

  // Helper: get config value (handles both camelCase and lowercase keys)
  function cfg(key: string): string {
    const val = config[key] ?? config[key.charAt(0).toLowerCase() + key.slice(1)]
    return String(val ?? '').trim()
  }
  function cfgNum(key: string): number {
    return parseInt(cfg(key).replace(/[^\d]/g, ''), 10) || 0
  }

  // Normalise buildType
  const bt = (buildType || '').toLowerCase().replace(/\s+/g, '-')

  // Graceful fallback for build types with no BOM mapping yet
  if (bt === 'beavertail') return []

  const isTruck = bt.includes('truck')
  const isTrailer = bt === 'trailer' || bt.includes('trailer') || bt.includes('and')

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCK
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTruck) {
    const mat = cfg('material') || cfg('truckMaterial')
    const isHardox = mat.toLowerCase().includes('hardox')
    const isAlly = mat.toLowerCase().includes('aluminium') || mat.toLowerCase().includes('alloy')
    const chassis = cfg('chassisMake').toLowerCase()
    const chassisModel = cfg('chassisModel')
    const bodyLen = cfgNum('bodyLength') || cfgNum('truckBodyLength')

    // ── Body ──
    if (isHardox) add('BOM100', 'Truck Body')
    if (isAlly) add('BOM101', 'Truck Body')

    // ── Subframe ──
    if (isHardox) add('BOM107', 'Truck Subframe')
    if (isAlly) add('BOM108', 'Truck Subframe')

    // ── Paint ──
    if (isHardox) { add('BOM176', 'Truck Paint'); add('BOM178', 'Truck Paint') }
    if (isAlly)   { add('BOM175', 'Truck Paint'); add('BOM178', 'Truck Paint') }

    // ── Towbar / Coupling ──
    const coupling = cfg('coupling') || cfg('truckCoupling')
    const isMack = chassis.includes('mack') || chassis.includes('ud')

    if (coupling.toLowerCase().includes('orlandi')) {
      add(isMack ? 'BOM210' : 'BOM109', 'Towbar')
    } else if (coupling.toLowerCase().includes('bartlett')) {
      add(isMack ? 'BOM213' : 'BOM112', 'Towbar')
    } else if (coupling.toLowerCase().includes('pintle')) {
      add('BOM111', 'Towbar')
    }

    // ── Tarp ──
    const tarpInfo = cfg('tarpSystem') || cfg('truckTarpMaterial') || cfg('truckTarp')
    if (tarpInfo && !tarpInfo.toLowerCase().includes('none') && bodyLen > 0) {
      // tarpSystem stores "PVC Razor Electric" / "Mesh Manual" etc — or legacy "Razor PVC/MESH Electric"
      const isPVC = tarpInfo.toLowerCase().includes('pvc') || !tarpInfo.toLowerCase().includes('mesh')
      // Tarp is 400mm shorter than the body (clears headboard and tailgate)
      const tarpLen = cfgNum('tarpLength') || (bodyLen - 400)
      const tarpBow = cfg('tarpBowSize') || cfg('bowSize')
      const tarpColour = cfg('tarpColour')
      const tarpBom = resolveTarpBom(isPVC, tarpLen)
      const tarpWidth = cfg('material')?.toLowerCase().includes('aluminium') ? 2340 : 2400
      const bowVal = tarpBow ? tarpBow.toString().replace(/mm$/i, '') : ''
      const tarpDims = [String(tarpLen), String(tarpWidth), bowVal].filter(Boolean).join(' x ')
      const tarpNote = tarpColour ? `${tarpDims} – ${tarpColour}` : tarpDims
      if (tarpBom) add(tarpBom, 'Truck Tarp', tarpNote)
      if (bowVal === '450') addTbd('Truck Tarp', 'Extra Charge to be added on PO for 450mm Bows')
      // Manual / Pull Out → handle kit
      const isManual = tarpInfo.toLowerCase().includes('manual') || tarpInfo.toLowerCase().includes('pull out')
      if (isManual) add('MRP20-14', 'Manual Tarp Handle')
      // Roll Right → controller kit
      if (tarpInfo.toLowerCase().includes('roll right')) add('MRP20-05', 'Roll Right Controller')
    }

    // ── Hoist ──
    const hoist = cfg('hoist') || cfg('truckHoist')
    if (hoist && hoist.toLowerCase() !== 'none') {
      const hoistPart = resolveHoist(hoist)
      if (hoistPart) {
        add(hoistPart, 'Hoist')
      } else {
        addTbd('Hoist', `Hoist: ${hoist} — part not in lookup, check MRPeasy`)
      }
    }

    // ── PTO ──
    const pto = cfg('pto') || cfg('truckPto')
    if (pto && pto.toLowerCase().includes('gearbox')) {
      const ptoResult = resolvePto(cfg('chassisMake'), chassisModel)
      if (ptoResult) {
        add(ptoResult.part, 'PTO')
        // Iveco also needs loom kit
        if (chassis.includes('iveco') || chassis.includes('stralis')) {
          add('500-23', 'PTO Loom')
        }
      } else {
        addTbd('PTO', `PTO required — send gearbox code to TES (${cfg('chassisMake')} ${chassisModel})`)
      }
    } else if (pto && pto.toLowerCase().includes('engine')) {
      addTbd('PTO', `Engine PTO — confirm part with TES (${cfg('chassisMake')} ${chassisModel})`)
    }

    // ── Hydraulic Pump ──
    const pump = cfg('pump') || cfg('pumpType')
    if (pump && pump !== 'None' && !pump.toLowerCase().includes('customer')) {
      const pumpPartMatch = pump.match(/500-(\d+)/)
      if (pumpPartMatch) {
        add(`500-${pumpPartMatch[1]}`, 'Hydraulic Pump')
      } else {
        addTbd('Hydraulic Pump', `Pump required — confirm part number`)
      }
    }

    // ── Spool Valve ──
    const hydOption = cfg('hydraulics') || cfg('truckHydraulics')
    if (hydOption.toLowerCase().includes('truck and trailer')) {
      add('500-224', 'Hydraulics')
    } else if (hydOption.toLowerCase().includes('single')) {
      add('500-86', 'Hydraulics')
    }

    // ── Hydraulic Tank ──
    const tankType = (cfg('hydTankType') || cfg('truckHydTankType')).toLowerCase()
    // Match by TES part number embedded in option (e.g. "TKBRS135S (135L) — 500-232")
    const tankPartMatch = tankType.match(/500-(\d+)/)
    if (tankPartMatch) {
      add(`500-${tankPartMatch[1]}`, 'Hydraulic Tank')
    } else if (tankType.includes('135') && tankType.includes('behind')) add('500-233', 'Hydraulic Tank')
    else if (tankType.includes('135') && tankType.includes('chassis')) add('500-232', 'Hydraulic Tank')
    else if (tankType.includes('200') && tankType.includes('behind')) add('500-231', 'Hydraulic Tank')
    else if (tankType.includes('200') && tankType.includes('chassis')) add('500-245', 'Hydraulic Tank')

    // ── Controls ──
    const controls = cfg('controls') || cfg('truckControls')
    if (controls.toLowerCase().includes('electric hand')) {
      add('500-170', 'Controls')
      addTbd('Controls', 'Confirm Stock before placing order')
    } else if (controls.toLowerCase().includes('in-cab')) {
      add('500-246', 'Controls')
    }

    // ── Brake Coupling ──
    const brakeCoupling = cfg('brakeCoupling') || cfg('truckBrakeCoupling')
    if (brakeCoupling.toLowerCase().includes('duomatic')) {
      add('40-205', 'Brake Coupling')
      add('40-206', 'Brake Coupling')
    }
    if (brakeCoupling.toLowerCase().includes('triomatic')) {
      addTbd('Brake Coupling', 'Triomatic coupling — confirm part numbers in MRPeasy')
    }

    // ── Chassis Extension ──
    const chassisExt = cfg('chassisExtension') || cfg('truckChassisExtension')
    if (chassisExt.toLowerCase() === 'yes') {
      add('BOMXXX', 'Chassis Extension')
    }

    // ── Hose Burst Valve ──
    const hoseBurst = cfg('hoseBurstValve') || cfg('truckHoseBurstValve')
    if (hoseBurst.toLowerCase() === 'yes') {
      add('500-227', 'HSV200P Hoist safety valve 200 l/min 1" BSPP air details')
    }

    // ── Body Extras ──
    const sideLights = cfg('sideLights')
    if (sideLights && sideLights !== 'None') {
      addTbd('Body Extras', `${sideLights} — confirm part number in MRPeasy`)
    }
    const antiSpray = cfg('antiSpray')
    if (antiSpray === 'Yes') {
      addTbd('Body Extras', 'Anti spray suppressant — confirm part number in MRPeasy')
    }
    const shovelHolder = cfg('shovelHolder')
    if (shovelHolder === 'Yes') {
      addTbd('Body Extras', 'Underbody shovel holder — confirm part number in MRPeasy')
    }
    const mudflaps = cfg('mudflaps')
    if (mudflaps && mudflaps !== 'None') {
      addTbd('Body Extras', `${mudflaps} — confirm part number in MRPeasy`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAILER
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTrailer) {
    const tMat = cfg('material') || cfg('trailerMaterial')
    const tIsHardox = tMat.toLowerCase().includes('hardox')
    const tIsAlly = tMat.toLowerCase().includes('aluminium') || tMat.toLowerCase().includes('alloy')
    const axles = cfgNum('axleCount') || cfgNum('trailerAxleCount')
    const axleMake = (cfg('axleMake') || cfg('trailerAxleMake')).toUpperCase()
    const axleType = (cfg('axleType') || cfg('trailerAxleType')).toLowerCase()
    const tBodyLen = cfgNum('bodyLength') || cfgNum('trailerBodyLength')
    const model = cfg('trailerModel').toLowerCase()
    const isDolly = model.includes('cd-') || model.includes('convertor') || model.includes('dolly')

    if (!isDolly) {
      // ── Trailer Body ──
      // 4-axle trailers come in two sizes: 7.7M (≤7700) and 8.3M (>7700)
      // BOMs with size suffix (7.7M) are for standard size
      // BOMs without suffix (BOM145/147) are for 8.3M bodies
      const is4a83 = axles === 4 && tBodyLen > 7700  // 8300mm body

      if (tIsHardox && axles === 3) add('BOM155', 'Trailer Body')
      if (tIsHardox && axles === 4 && !is4a83) add('BOM156', 'Trailer Body')
      if (tIsHardox && axles === 4 && is4a83)  add('BOM147', 'Trailer Body')  // 8.3M hardox
      if (tIsHardox && axles === 5) add('BOM157', 'Trailer Body')
      if (tIsAlly && axles === 3) add('BOM158', 'Trailer Body')
      if (tIsAlly && axles === 4 && !is4a83) add('BOM159', 'Trailer Body')
      if (tIsAlly && axles === 4 && is4a83)  add('BOM145', 'Trailer Body')  // 8.3M aluminium
      if (tIsAlly && axles === 5) add('BOM160', 'Trailer Body')

      // ── Running Gear ──
      // Same size logic: size-specific BOMs (7.7M/5.4M/9.2M) vs generic BOMs for 8.3M
      const isDrum = axleType.includes('drum')
      const isDisc = axleType.includes('disc')

      if (axleMake === 'SAF' && isDrum) {
        if (axles === 3) add('BOM161', 'Running Gear')
        if (axles === 4 && !is4a83) add('BOM162', 'Running Gear')  // SAF Drum 7.7M
        if (axles === 4 && is4a83)  add('BOM105', 'Running Gear')  // SAF Drum 8.3M
        if (axles === 5) add('BOM163', 'Running Gear')
      } else if (axleMake === 'SAF' && isDisc) {
        if (axles === 3) add('BOM164', 'Running Gear')
        if (axles === 4 && !is4a83) add('BOM165', 'Running Gear')  // SAF Disc 7.7M
        if (axles === 4 && is4a83)  add('BOM150', 'Running Gear')  // Disc 8.3M
        if (axles === 5) add('BOM166', 'Running Gear')
      } else if (axleMake === 'TMC' && isDisc) {
        if (axles === 3) add('BOM167', 'Running Gear')
        if (axles === 4 && !is4a83) add('BOM168', 'Running Gear')  // TMC Disc 7.7M
        if (axles === 4 && is4a83)  add('BOM153', 'Running Gear')  // TMC Disc 8.3M
        if (axles === 5) add('BOM169', 'Running Gear')
      } else if (isDrum) {
        if (axles === 3) add('BOM104', 'Running Gear')
        if (axles === 4) add('BOM105', 'Running Gear')
        if (axles === 5) add('BOM106', 'Running Gear')
      } else if (isDisc) {
        if (axles === 3) add('BOM149', 'Running Gear')
        if (axles === 4) add('BOM150', 'Running Gear')
        if (axles === 5) add('BOM151', 'Running Gear')
      }

      // ── Drawbar ──
      if (axles === 3) add('BOM171', 'Drawbar')
      if (axles === 4) add('BOM172', 'Drawbar')
      if (axles === 5) add('BOM173', 'Drawbar')

      // ── Paint – Trailer ──
      if (tIsHardox && axles === 3) { add('BOM179', 'Trailer Paint'); add('BOM182', 'Trailer Paint') }
      if (tIsHardox && axles === 4) { add('BOM180', 'Trailer Paint'); add('BOM183', 'Trailer Paint') }
      if (tIsHardox && axles === 5) { add('BOM193', 'Trailer Paint'); add('BOM192', 'Trailer Paint') }
      if (tIsAlly && axles === 3) add('BOM189', 'Trailer Paint')
      if (tIsAlly && axles === 4) add('BOM190', 'Trailer Paint')
      if (tIsAlly && axles === 5) add('BOM191', 'Trailer Paint')
      add('BOM186', 'Trailer Paint')  // Drawbar paint always

      // ── Tarp – Trailer ──
      const tTarp = cfg('tarpSystem') || cfg('trailerTarp')
      if (tTarp && !tTarp.toLowerCase().includes('none') && tBodyLen > 0) {
        const tIsPVC = tTarp.toLowerCase().includes('pvc') || !tTarp.toLowerCase().includes('mesh')
        const tTarpLen = cfgNum('tarpLength') || tBodyLen
        const tTarpBow = cfg('tarpBowSize') || cfg('bowSize')
        const tTarpColour = cfg('tarpColour')
        const tarpBom = resolveTarpBom(tIsPVC, tTarpLen)
        const tTarpWidth = cfg('material')?.toLowerCase().includes('aluminium') ? 2340 : 2400
        const tBowVal = tTarpBow ? tTarpBow.toString().replace(/mm$/i, '') : ''
        const tTarpDims = [String(tTarpLen), String(tTarpWidth), tBowVal].filter(Boolean).join(' x ')
        const tTarpNote = tTarpColour ? `${tTarpDims} – ${tTarpColour}` : tTarpDims
        if (tarpBom) add(tarpBom, 'Trailer Tarp', tTarpNote)
        if (tBowVal === '450') addTbd('Trailer Tarp', 'Extra Charge to be added on PO for 450mm Bows')
        const tIsManual = tTarp.toLowerCase().includes('manual') || tTarp.toLowerCase().includes('pull out')
        if (tIsManual) add('MRP20-14', 'Manual Tarp Handle')
        if (tTarp.toLowerCase().includes('roll right')) add('MRP20-05', 'Roll Right Controller')
      }

      // ── Hose Burst Valve – Trailer ──
      const tHoseBurst = cfg('hoseBurstValve') || cfg('trailerHoseBurstValve')
      if (tHoseBurst.toLowerCase() === 'yes') {
        add('500-227', 'HSV200P Hoist safety valve 200 l/min 1" BSPP air details')
      }

      // ── Wheels & Tyres ── default to 335 PCD (most common in real quotes)
      // TODO: add trailerTyreSize field to form for precision
      if (axles === 3) add('BOM198', 'Wheels & Tyres')
      if (axles === 4) add('BOM194', 'Wheels & Tyres')
      if (axles === 5) add('BOM199', 'Wheels & Tyres')

    } else {
      // ── Convertor Dolly ──
      add('BOM185', 'Dolly Paint')
      addTbd('Dolly', 'Convertor dolly assembly — confirm BOM codes for this build')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRUCK + TRAILER (combo builds)
  // ═══════════════════════════════════════════════════════════════════════════
  // For combo builds, the above isTruck and isTrailer blocks both fire.
  // The config may store truck-specific fields under truckConfig and trailer
  // fields under trailerConfig (check buildConfiguration() in the builder).
  // The cfg() helper already handles flat config — if nested, the accept route
  // should flatten before calling this resolver.

  return boms
}

