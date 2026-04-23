import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/jobs/[id]/parts-info
 * Returns section-specific details from the linked quote config for display
 * in the Parts Tracker (tarp specs, hoist type, axle info, etc.)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let job = await prisma.job.findUnique({ where: { id: params.id } })
    if (!job) job = await prisma.job.findUnique({ where: { num: params.id } })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const quote = await prisma.quote.findFirst({
      where: { jobId: job.id },
      select: { buildType: true, configuration: true },
    })

    if (!quote?.configuration) return NextResponse.json({})

    const cfg = quote.configuration as Record<string, unknown>
    const c = (key: string) => String(cfg[key] || cfg[key.toLowerCase()] || '').trim()
    const n = (key: string) => Number(c(key)) || 0

    // ── Tarp ─────────────────────────────────────────────────────────────────
    const tarpSystem  = c('tarpSystem') || c('truckTarpMaterial') || c('truckTarp') || c('trailerTarp')
    const tarpColour  = c('tarpColour')
    const bodyLen     = n('bodyLength') || n('trailerBodyLength')
    const tarpLen     = n('tarpLength') || (bodyLen > 0 ? bodyLen - 400 : 0)
    const bowSize     = c('tarpBowSize') || c('bowSize')
    const bodyHeight  = n('bodyHeight')
    const material    = c('material').toLowerCase()

    let bow = bowSize
    if (material.includes('aluminium')) bow = '250mm'
    else if (material.includes('hardox') && bodyHeight === 1000) bow = '450mm'
    else if (material.includes('hardox') && bodyHeight === 1100) bow = '380mm'

    const isManual  = tarpSystem.toLowerCase().includes('manual') || tarpSystem.toLowerCase().includes('pull out')
    const isElectric = tarpSystem.toLowerCase().includes('electric')
    const isPVC     = tarpSystem.toLowerCase().includes('pvc') || !tarpSystem.toLowerCase().includes('mesh')
    const isRazor   = tarpSystem.toLowerCase().includes('razor')
    const isEzi     = tarpSystem.toLowerCase().includes('ezi')
    const isPulltarp = tarpSystem.toLowerCase().includes('pulltarp')
    const isNone    = !tarpSystem || tarpSystem.toLowerCase().includes('none')

    let tarpTypeLabel = ''
    if (!isNone) {
      if (isRazor)    tarpTypeLabel = `Razor ${isPVC ? 'PVC' : 'Mesh'} ${isElectric ? 'Electric' : 'Manual'}`
      else if (isEzi) tarpTypeLabel = `EziTarp ${isElectric ? 'Electric' : 'Manual'}`
      else if (isPulltarp) tarpTypeLabel = 'Pulltarp Manual'
      else            tarpTypeLabel = tarpSystem
    }

    const tarp = isNone ? null : {
      system:  tarpTypeLabel || tarpSystem,
      colour:  tarpColour,
      length:  tarpLen > 0 ? `${tarpLen.toLocaleString()}mm` : '',
      bow:     bow,
      manual:  isManual,
      electric: isElectric,
    }

    // ── Hoist ─────────────────────────────────────────────────────────────────
    const hoistType    = c('hoistType') || c('hoist')
    const hydTankType  = c('hydTankType') || c('hydTank')
    const hydraulics   = c('hydraulics')
    const controls     = c('controls')
    const pivotCentre  = c('pivotCentre') || c('hoistPivotCentre')

    const hoist = !hoistType ? null : {
      type:      hoistType,
      hydTank:   hydTankType,
      hydraulics,
      controls,
      pivot:     pivotCentre ? `${pivotCentre}mm` : '',
    }

    // ── PTO ──────────────────────────────────────────────────────────────────
    const pto         = c('pto') || c('ptoType')
    const chassisMake = c('chassisMake') || c('make')
    const chassisModel = c('chassisModel') || c('model')

    const ptoInfo = !pto || pto.toLowerCase() === 'none' ? null : {
      type:    pto,
      chassis: [chassisMake, chassisModel].filter(Boolean).join(' ') || '',
    }

    // ── Axles (trailers) ──────────────────────────────────────────────────────
    const axleMake    = c('axleMake')
    const axleCount   = c('axleCount')
    const axleType    = c('axleType')
    const suspension  = c('suspension') || c('suspensionType')
    const studPattern = c('studPattern')
    const axleLift    = c('axleLift')

    const axles = !axleMake && !axleCount ? null : {
      make:      axleMake,
      count:     axleCount,
      type:      axleType,
      suspension,
      studPattern,
      axleLift,
    }

    return NextResponse.json({ tarp, hoist, pto: ptoInfo, axles })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
