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
  'mfb3126.3.2960':         '500-297',
  'mfb3128.3.2960':         '500-297',
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

// ─── Trailer Chassis Length Lookup ───────────────────────────────────────────
// Maps trailer body length (mm) to the correct chassis length (mm) to order.
const CHASSIS_LOOKUP: [number, number][] = [
  [5300, 4930], [5350, 4930], [5400, 4930],
  [6000, 5450], [6100, 5450],
  [7700, 7470],
  [8300, 7870],
  [9200, 8950], [9600, 8950],
  [10200, 9450],
]

function resolveChassisLength(bodyLengthMm: number): number | null {
  // Exact match first
  for (const [body, chassis] of CHASSIS_LOOKUP) {
    if (body === bodyLengthMm) return chassis
  }
  // Nearest match within ±150mm (handles minor rounding differences)
  let best: number | null = null
  let bestDiff = Infinity
  for (const [body, chassis] of CHASSIS_LOOKUP) {
    const diff = Math.abs(body - bodyLengthMm)
    if (diff < bestDiff) { bestDiff = diff; best = chassis }
  }
  return bestDiff <= 150 ? best : null
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

  // For truck-and-trailer builds, truck/trailer fields are nested under truckConfig/trailerConfig.
  // These scoped helpers read from the nested sub-config first, then fall back to the flat config.
  const truckSub = (config.truckConfig ?? {}) as Record<string, unknown>
  const trailerSub = (config.trailerConfig ?? {}) as Record<string, unknown>
  function tcfg(key: string): string {
    const val = truckSub[key] ?? config[key]
    return String(val ?? '').trim()
  }
  function tcfgNum(key: string): number {
    return parseInt(tcfg(key).replace(/[^\d]/g, ''), 10) || 0
  }
  function trcfg(key: string): string {
    const val = trailerSub[key] ?? config[key]
    return String(val ?? '').trim()
  }
  function trcfgNum(key: string): number {
    return parseInt(trcfg(key).replace(/[^\d]/g, ''), 10) || 0
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
    const mat = tcfg('material') || tcfg('truckMaterial')
    const isHardox = mat.toLowerCase().includes('hardox')
    const isAlly = mat.toLowerCase().includes('aluminium') || mat.toLowerCase().includes('alloy')
    const chassis = tcfg('chassisMake').toLowerCase()
    const chassisModel = tcfg('chassisModel')
    const bodyLen = tcfgNum('bodyLength') || tcfgNum('truckBodyLength')

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
    const coupling = tcfg('coupling') || tcfg('truckCoupling')
    const isMack = chassis.includes('mack') || chassis.includes('ud')

    if (coupling.toLowerCase().includes('orlandi')) {
      add(isMack ? 'BOM210' : 'BOM109', 'Towbar')
    } else if (coupling.toLowerCase().includes('bartlett')) {
      add(isMack ? 'BOM213' : 'BOM112', 'Towbar')
    } else if (coupling.toLowerCase().includes('pintle')) {
      add('BOM111', 'Towbar')
    }

    // ── Tarp ──
    const tarpInfo = tcfg('tarpSystem') || tcfg('truckTarpMaterial') || tcfg('truckTarp')
    if (tarpInfo && !tarpInfo.toLowerCase().includes('none') && bodyLen > 0) {
      // tarpSystem stores "PVC Razor Electric" / "Mesh Manual" etc — or legacy "Razor PVC/MESH Electric"
      const isPVC = tarpInfo.toLowerCase().includes('pvc') || !tarpInfo.toLowerCase().includes('mesh')
      // Tarp is 400mm shorter than the body (clears headboard and tailgate)
      const tarpLen = tcfgNum('tarpLength') || (bodyLen - 400)
      const tarpBow = tcfg('tarpBowSize') || tcfg('bowSize')
      const tarpColour = tcfg('tarpColour')
      const tarpBom = resolveTarpBom(isPVC, tarpLen)
      const tarpWidth = tcfg('material').toLowerCase().includes('aluminium') ? 2340 : 2400
      const rawBowVal = tarpBow ? tarpBow.toString().replace(/mm$/i, '') : ''
      // 380mm bows were incorrectly calculated — steel/hardox bodies always use 450mm bows
      const bowVal = rawBowVal === '380' ? '450' : rawBowVal
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
    const hoist = tcfg('hoist') || tcfg('truckHoist')
    if (hoist && hoist.toLowerCase() !== 'none') {
      const hoistPart = resolveHoist(hoist)
      if (hoistPart) {
        add(hoistPart, 'Hoist')
      } else {
        addTbd('Hoist', `Hoist: ${hoist} — part not in lookup, check MRPeasy`)
      }
    }

    // ── PTO ──
    const pto = tcfg('pto') || tcfg('truckPto')
    if (pto && pto.toLowerCase().includes('gearbox')) {
      const ptoResult = resolvePto(tcfg('chassisMake'), chassisModel)
      if (ptoResult) {
        add(ptoResult.part, 'PTO')
        // Iveco also needs loom kit
        if (chassis.includes('iveco') || chassis.includes('stralis')) {
          add('500-23', 'PTO Loom')
        }
      } else {
        addTbd('PTO', `PTO required — send gearbox code to TES (${tcfg('chassisMake')} ${chassisModel})`)
      }
    } else if (pto && pto.toLowerCase().includes('engine')) {
      addTbd('PTO', `Engine PTO — confirm part with TES (${tcfg('chassisMake')} ${chassisModel})`)
    }

    // ── Hydraulic Pump ──
    const pump = tcfg('pump') || tcfg('pumpType')
    if (pump && pump !== 'None' && !pump.toLowerCase().includes('customer')) {
      const pumpPartMatch = pump.match(/500-(\d+)/)
      if (pumpPartMatch) {
        add(`500-${pumpPartMatch[1]}`, 'Hydraulic Pump')
      } else {
        addTbd('Hydraulic Pump', `Pump required — confirm part number`)
      }
    }

    // ── Spool Valve ──
    const hydOption = tcfg('hydraulics') || tcfg('truckHydraulics')
    if (hydOption.toLowerCase().includes('truck and trailer')) {
      add('500-224', 'Hydraulics')
    } else if (hydOption.toLowerCase().includes('single')) {
      add('500-86', 'Hydraulics')
    }

    // ── Hydraulic Tank ──
    const tankType = (tcfg('hydTankType') || tcfg('truckHydTankType')).toLowerCase()
    // Match by TES part number embedded in option (e.g. "TKBRS135S (135L) — 500-232")
    const tankPartMatch = tankType.match(/500-(\d+)/)
    if (tankPartMatch) {
      add(`500-${tankPartMatch[1]}`, 'Hydraulic Tank')
    } else if (tankType.includes('135') && tankType.includes('behind')) add('500-233', 'Hydraulic Tank')
    else if (tankType.includes('135') && tankType.includes('chassis')) add('500-232', 'Hydraulic Tank')
    else if (tankType.includes('200') && tankType.includes('behind')) add('500-231', 'Hydraulic Tank')
    else if (tankType.includes('200') && tankType.includes('chassis')) add('500-245', 'Hydraulic Tank')

    // ── Controls ──
    const controls = tcfg('controls') || tcfg('truckControls')
    if (controls.toLowerCase().includes('electric hand')) {
      add('500-170', 'Controls')
      addTbd('Controls', 'Confirm Stock before placing order of 500-170')
    } else if (controls.toLowerCase().includes('in-cab')) {
      add('500-246', 'Controls')
    }

    // ── Brake Coupling ──
    const brakeCoupling = tcfg('brakeCoupling') || tcfg('truckBrakeCoupling')
    if (brakeCoupling.toLowerCase().includes('duomatic')) {
      add('40-205', 'Brake Coupling')
      add('40-207', 'Brake Coupling')
    }
    if (brakeCoupling.toLowerCase().includes('triomatic')) {
      addTbd('Brake Coupling', 'Triomatic coupling — confirm part numbers in MRPeasy')
    }

    // ── Chassis Extension ──
    const chassisExt = tcfg('chassisExtension') || tcfg('truckChassisExtension')
    if (chassisExt.toLowerCase() === 'yes') {
      add('BOMXXX', 'Chassis Extension')
    }

    // ── Hose Burst Valve ──
    const hoseBurst = tcfg('hoseBurstValve') || tcfg('truckHoseBurstValve')
    if (hoseBurst.toLowerCase() === 'yes') {
      add('500-227', 'Hydraulics')
    }

    // ── Body Extras ──
    const sideLights = tcfg('sideLights')
    if (sideLights && sideLights !== 'None') {
      addTbd('Body Extras', `${sideLights} — confirm part number in MRPeasy`)
    }
    const antiSpray = tcfg('antiSpray')
    if (antiSpray === 'Yes') {
      addTbd('Body Extras', 'Anti spray suppressant — confirm part number in MRPeasy')
    }
    const shovelHolder = tcfg('shovelHolder')
    if (shovelHolder === 'Yes') {
      addTbd('Body Extras', 'Underbody shovel holder — confirm part number in MRPeasy')
    }
    const mudflaps = tcfg('mudflaps')
    if (mudflaps && mudflaps !== 'None') {
      addTbd('Body Extras', `${mudflaps} — confirm part number in MRPeasy`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAILER
  // ═══════════════════════════════════════════════════════════════════════════
  if (isTrailer) {
    const tMat = trcfg('material') || trcfg('trailerMaterial')
    const tIsHardox = tMat.toLowerCase().includes('hardox')
    const tIsAlly = tMat.toLowerCase().includes('aluminium') || tMat.toLowerCase().includes('alloy')
    const axles = trcfgNum('axleCount') || trcfgNum('trailerAxleCount')
    const axleMake = (trcfg('axleMake') || trcfg('trailerAxleMake')).toUpperCase()
    const axleType = (trcfg('axleType') || trcfg('trailerAxleType')).toLowerCase()
    const tBodyLen = trcfgNum('bodyLength') || trcfgNum('trailerBodyLength')
    const model = trcfg('trailerModel').toLowerCase()
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

      // ── Trailer Chassis ──
      const chassisLen = resolveChassisLength(tBodyLen)
      if (chassisLen) {
        addTbd('Trailer Chassis', `Trailer Chassis — ${chassisLen}mm (body ${tBodyLen}mm)`)
      } else if (tBodyLen > 0) {
        addTbd('Trailer Chassis', `Trailer Chassis — confirm length for ${tBodyLen}mm body`)
      }

      // ── Running Gear ──
      // Same size logic: size-specific BOMs (7.7M/5.4M/9.2M) vs generic BOMs for 8.3M
      const isDrum = axleType.includes('drum')
      const isDisc = axleType.includes('disc')
      const suspNote = trcfg('suspension') ? `${trcfg('suspension')} Suspension` : undefined
      function addRg(code: string, comment?: string) {
        add(code, 'Running Gear', [suspNote, comment].filter(Boolean).join(' – ') || undefined)
      }

      if (axleMake === 'SAF' && isDrum) {
        if (axles === 3) addRg('BOM161')
        if (axles === 4 && !is4a83) addRg('BOM162')  // SAF Drum 7.7M
        if (axles === 4 && is4a83)  addRg('BOM105')  // SAF Drum 8.3M
        if (axles === 5) addRg('BOM163')
      } else if (axleMake === 'SAF' && isDisc) {
        if (axles === 3) addRg('BOM164')
        if (axles === 4 && !is4a83) addRg('BOM165')  // SAF Disc 7.7M
        if (axles === 4 && is4a83)  addRg('BOM150')  // Disc 8.3M
        if (axles === 5) addRg('BOM166')
      } else if (axleMake === 'TMC' && isDisc) {
        if (axles === 3) addRg('BOM167')
        if (axles === 4 && !is4a83) addRg('BOM168')  // TMC Disc 7.7M
        if (axles === 4 && is4a83)  addRg('BOM153')  // TMC Disc 8.3M
        if (axles === 5) addRg('BOM169')
      } else if (isDrum) {
        if (axles === 3) addRg('BOM104')
        if (axles === 4) addRg('BOM105')
        if (axles === 5) addRg('BOM106')
      } else if (isDisc) {
        if (axles === 3) addRg('BOM149')
        if (axles === 4) addRg('BOM150')
        if (axles === 5) addRg('BOM151')
      }

      // ── Axle Lift ──
      if (trcfg('axleLift').toLowerCase() === 'yes') add('BOM121', 'Axle Lift')

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
      const tTarp = trcfg('tarpSystem') || trcfg('trailerTarp')
      if (tTarp && !tTarp.toLowerCase().includes('none') && tBodyLen > 0) {
        const tIsPVC = tTarp.toLowerCase().includes('pvc') || !tTarp.toLowerCase().includes('mesh')
        const tTarpLen = trcfgNum('tarpLength') || (tBodyLen - 400)
        const tTarpBow = trcfg('tarpBowSize') || trcfg('bowSize')
        const tTarpColour = trcfg('tarpColour')
        const tarpBom = resolveTarpBom(tIsPVC, tTarpLen)
        const tTarpWidth = trcfg('material').toLowerCase().includes('aluminium') ? 2340 : 2400
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
      const tHoseBurst = trcfg('hoseBurstValve') || trcfg('trailerHoseBurstValve')
      if (tHoseBurst.toLowerCase() === 'yes') {
        add('500-227', 'Hydraulics')
      }

      // ── Hoist – Trailer ──
      const tHoist = trcfg('hoist')
      if (tHoist && tHoist.toLowerCase() !== 'none') {
        const tHoistPart = resolveHoist(tHoist)
        if (tHoistPart) {
          add(tHoistPart, 'Hoist')
        } else {
          addTbd('Hoist', `Hoist: ${tHoist} — part not in lookup, check MRPeasy`)
        }
      }

      // ── Body Extras – Trailer ──
      const tSideLights = trcfg('sideLights')
      if (tSideLights && tSideLights !== 'None') {
        addTbd('Body Extras', `${tSideLights} — confirm part number in MRPeasy`)
      }
      const tAntiSpray = trcfg('antiSpray')
      if (tAntiSpray === 'Yes') {
        addTbd('Body Extras', 'Anti spray suppressant — confirm part number in MRPeasy')
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
  // tcfg/trcfg helpers read from the nested truckConfig/trailerConfig sub-objects
  // first, then fall back to flat config keys — so both flat and nested layouts work.

  return boms
}

