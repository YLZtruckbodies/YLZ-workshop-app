import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deriveBtype } from '@/lib/jobTypes'
import { resolveBoms } from '@/lib/bom-resolver'
import { runKickoffAgent, runTrailerKickoffAgent } from '@/lib/kickoff-agent'

// ─── Job number generator — pulls next N available from Job Sheet Master ─────
async function nextJobNumbers(count: number): Promise<string[]> {
  const [masters, jobs] = await Promise.all([
    prisma.jobMaster.findMany({ select: { jobNumber: true } }),
    prisma.job.findMany({ select: { num: true } }),
  ])

  let maxNum = 1122
  for (const j of masters) {
    const match = j.jobNumber.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum && n < 9000) maxNum = n
    }
  }
  for (const j of jobs) {
    const match = j.num.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum && n < 9000) maxNum = n
    }
  }

  return Array.from({ length: count }, (_, i) => `YLZ${maxNum + 1 + i}`)
}

async function nextJobNumber(): Promise<string> {
  const [n] = await nextJobNumbers(1)
  return n
}

// ─── Trailer VIN generator ─────────────────────────────────────────────────
const VIN_YEAR_CODES: Record<number, string> = {
  2026: 'T', 2027: 'V', 2028: 'W', 2029: 'X', 2030: 'Y',
  2031: '1', 2032: '2', 2033: '3', 2034: '4', 2035: '5',
  2036: '6', 2037: '7', 2038: '8', 2039: '9',
  2040: 'A', 2041: 'B', 2042: 'C', 2043: 'D', 2044: 'E',
  2045: 'F', 2046: 'G', 2047: 'H', 2048: 'J', 2049: 'K',
  2050: 'L', 2051: 'M', 2052: 'N',
}

function trailerVinPrefix(model: string): string {
  if (model.startsWith('DT-')) return '6K9D0GTRL'
  if (model.startsWith('ST-')) return '6K9SEMTRL'
  return '6K9P1GTRL' // CD- Convertor Dolly and others
}

async function nextTrailerVin(model: string): Promise<string> {
  const quotes = await prisma.quote.findMany({
    where: { buildType: { in: ['trailer', 'truck-and-trailer'] } },
    select: { configuration: true },
  })

  let maxSeq = 841182 // so first generated is 841183
  for (const q of quotes) {
    const cfg = q.configuration as Record<string, any>
    const vin: string = cfg?.vin || cfg?.trailerConfig?.vin || ''
    if (!vin) continue
    const seq = parseInt(vin.slice(-6), 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  const year = new Date().getFullYear()
  const yearCode = VIN_YEAR_CODES[year] ?? 'T'
  const prefix = trailerVinPrefix(model)
  return `${prefix}${yearCode}P${maxSeq + 1}`
}

function btypeToJobMasterType(btype: string): string {
  if (btype === 'ally-trailer' || btype === 'hardox-trailer') return 'TRAILER'
  if (btype === 'wheelbase') return 'WHEELBASE'
  if (btype === 'dolly') return 'CONVERTER DOLLY'
  if (btype === 'beavertail') return 'BEAVERTAIL'
  if (btype === 'tag-trailer') return 'TAG TRAILER'
  if (btype === 'repairs') return 'REPAIRS'
  return 'TRUCK'
}

// ─── Build a human-readable type string for the Job.type field ────────────────
function jobTypeString(quote: { buildType: string; configuration: any }): string {
  const cfg = quote.configuration as Record<string, any>
  const bt = quote.buildType.toLowerCase()

  if (bt.includes('truck') && bt.includes('trailer')) {
    const mat = cfg.truckConfig?.material || cfg.material || ''
    const tModel = cfg.trailerConfig?.trailerModel || cfg.trailerModel || 'Dog Trailer'
    return `${mat} Truck Body + ${tModel}`.trim()
  }

  if (bt.includes('truck') || bt.includes('body')) {
    const mat = cfg.material || ''
    return `${mat} Tipper Body`.trim()
  }

  if (bt.includes('trailer')) {
    const mat = cfg.material || ''
    const model = cfg.trailerModel || 'Trailer'
    return `${mat} ${model}`.trim()
  }

  if (bt.includes('beavertail')) {
    return 'Beavertail with Twin Ramps'
  }

  if (bt.includes('tag-trailer') || bt === 'tag trailer') {
    return '3-Axle Tag Trailer'
  }

  if (bt === 'repairs') {
    const desc = cfg.repairDescription || 'Repairs / Warranty'
    const unit = cfg.repairUnit ? ` — ${cfg.repairUnit}` : ''
    return `${desc}${unit}`.trim()
  }

  return quote.buildType
}

// ─── Split type strings for paired truck+trailer jobs ────────────────────────
function truckOnlyTypeString(quote: { configuration: any }): string {
  const cfg = quote.configuration as Record<string, any>
  const mat = cfg.truckConfig?.material || cfg.material || ''
  return `${mat} Truck Body`.trim()
}

function trailerOnlyTypeString(quote: { configuration: any }): string {
  const cfg = quote.configuration as Record<string, any>
  const mat = cfg.trailerConfig?.material || cfg.truckConfig?.material || cfg.material || ''
  const tModel = cfg.trailerConfig?.trailerModel || cfg.trailerModel || 'Dog Trailer'
  return `${mat} ${tModel}`.trim()
}

// ─── Email helper (graceful — no-ops if RESEND_API_KEY not set) ───────────────
async function sendWorkshopEmail(opts: {
  quoteNumber: string
  jobNumber: string
  customer: string
  buildType: string
  quoteId: string
  preparedBy: string
  baseUrl: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY not configured' }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const jobsheetUrl = `${opts.baseUrl}/quotes/${opts.quoteId}/jobsheet`
  const quoteUrl = `${opts.baseUrl}/quotes/${opts.quoteId}/print`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px">
      <div style="background:#E8681A;padding:16px 24px;border-radius:6px 6px 0 0">
        <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px">YLZ — New Job Created</span>
      </div>
      <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 6px 6px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#666;font-size:13px;width:160px">Job Number</td><td style="font-weight:700;font-size:15px">${opts.jobNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">Quote Reference</td><td style="font-weight:600">${opts.quoteNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">Customer</td><td style="font-weight:600">${opts.customer}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">Build Type</td><td style="font-weight:600">${opts.buildType}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px">Prepared By</td><td>${opts.preparedBy}</td></tr>
        </table>
        <div style="display:flex;gap:12px;margin-bottom:24px">
          <a href="${jobsheetUrl}" style="background:#E8681A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:700;font-size:13px">📋 Print Job Sheet</a>
          <a href="${quoteUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:700;font-size:13px">🖨 View Quote</a>
        </div>
        <p style="color:#999;font-size:12px;margin:0">
          Job is staged at <strong>Requires Engineering</strong> in the Pending group on the Job Board.<br>
          Advance to Go Ahead once engineering sign-off is complete.
        </p>
      </div>
    </div>
  `

  const workshopEmail = process.env.WORKSHOP_EMAIL || process.env.FROM_EMAIL || 'workshop@ylztrucks.com.au'
  const fromEmail = process.env.FROM_EMAIL || 'noreply@ylztrucks.com.au'

  try {
    await resend.emails.send({
      from: fromEmail,
      to: workshopEmail,
      subject: `New Job: ${opts.jobNumber} — ${opts.customer} (${opts.quoteNumber})`,
      html,
    })
    return { sent: true }
  } catch (err: any) {
    return { sent: false, reason: err.message }
  }
}

// ─── Test quote accept — creates isolated test job, skips all side effects ────
async function nextTestJobNumbers(count: number): Promise<string[]> {
  const testJobs = await prisma.job.findMany({
    where: { isTest: true },
    select: { num: true },
  })
  let maxNum = 0
  for (const j of testJobs) {
    const match = j.num.match(/TST(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }
  return Array.from({ length: count }, (_, i) => `TST${String(maxNum + 1 + i).padStart(3, '0')}`)
}

async function acceptTestQuote(quote: any): Promise<NextResponse> {
  const isPaired = (quote.buildType || '').toLowerCase().includes('truck') &&
    (quote.buildType || '').toLowerCase().includes('trailer')

  if (isPaired) {
    const [truckNum, trailerNum] = await nextTestJobNumbers(2)
    const cfg = quote.configuration as Record<string, any>
    const makeStr = [cfg.chassisMake || cfg.truckConfig?.chassisMake || '', cfg.chassisModel || cfg.truckConfig?.chassisModel || ''].filter(Boolean).join(' ')

    const truckJob = await prisma.job.create({
      data: {
        num: truckNum, type: truckOnlyTypeString(quote), customer: quote.customerName,
        dealer: quote.dealerName, stage: 'Requires Engineering', prodGroup: 'pending',
        btype: deriveBtype(truckOnlyTypeString(quote)), make: makeStr,
        notes: quote.notes || '', sortOrder: 0, isTest: true,
      },
    })
    const trailerJob = await prisma.job.create({
      data: {
        num: trailerNum, type: trailerOnlyTypeString(quote), customer: quote.customerName,
        dealer: quote.dealerName, stage: 'Requires Engineering', prodGroup: 'pending',
        btype: deriveBtype(trailerOnlyTypeString(quote)), make: '', notes: quote.notes || '',
        sortOrder: 0, pairedId: truckJob.id, isTest: true,
      },
    })
    await prisma.job.update({ where: { id: truckJob.id }, data: { pairedId: trailerJob.id } })
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'accepted', acceptedAt: new Date(), jobId: truckJob.id } })
    return NextResponse.json({ ok: true, job: { id: truckJob.id, num: truckJob.num }, pairedJob: { id: trailerJob.id, num: trailerJob.num }, isExisting: false, partsOrderId: null, pairedPartsOrderId: null, email: { sent: false, reason: 'test mode' } })
  }

  const [jobNum] = await nextTestJobNumbers(1)
  const typeStr = jobTypeString(quote)
  const cfg = quote.configuration as Record<string, any>
  const makeStr = [cfg.chassisMake || cfg.truckConfig?.chassisMake || '', cfg.chassisModel || cfg.truckConfig?.chassisModel || ''].filter(Boolean).join(' ')

  const job = await prisma.job.create({
    data: {
      num: jobNum, type: typeStr, customer: quote.customerName, dealer: quote.dealerName,
      stage: 'Requires Engineering', prodGroup: 'pending', btype: deriveBtype(typeStr),
      make: makeStr, notes: quote.notes || '', sortOrder: 0, isTest: true,
    },
  })
  try {
    const quoteConfig = (quote.configuration && typeof quote.configuration === 'object') ? quote.configuration as Record<string, unknown> : {}
    const bomList = resolveBoms(quote.buildType, quoteConfig)
    if (bomList.length > 0) await prisma.job.update({ where: { id: job.id }, data: { bomList: bomList as any } })
  } catch {}

  await prisma.quote.update({ where: { id: quote.id }, data: { status: 'accepted', acceptedAt: new Date(), jobId: job.id } })
  return NextResponse.json({ ok: true, job: { id: job.id, num: job.num }, pairedJob: null, isExisting: false, partsOrderId: null, pairedPartsOrderId: null, email: { sent: false, reason: 'test mode' } })
}

// ─── Accept endpoint ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  const existingJobNum: string | null = body.existingJobNum?.trim() || null
  const customJobNum: string | null = body.customJobNum?.trim() || null

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { lineItems: true },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }
  // Allow re-accepting quotes that were flagged 'accepted' but have no job yet
  // (e.g. status was changed via the quote builder's status dropdown without
  // going through the accept flow). Only block when a job actually exists.
  if (quote.status === 'accepted' && quote.jobId) {
    return NextResponse.json({ error: 'Quote already accepted', jobId: quote.jobId }, { status: 409 })
  }

  // ── Test quote — isolated flow, no emails, no kickoff, no side effects ──
  if ((quote as any).isTest) return acceptTestQuote(quote)

  const typeStr = jobTypeString(quote as any)
  const btype = deriveBtype(typeStr)
  const origin = req.headers.get('origin') || req.headers.get('x-forwarded-host') || 'http://localhost:3000'

  const rawBuildType = (quote.buildType || '').toLowerCase()
  // Truck+trailer quotes always create two jobs — a custom job number (if supplied)
  // is treated as the truck's number and the trailer's number is auto-generated.
  const isPairedQuote = rawBuildType.includes('truck') && rawBuildType.includes('trailer') && !existingJobNum

  let job: { id: string; num: string }
  let pairedJob: { id: string; num: string } | null = null
  let isExisting = false
  let partsOrderId: string | null = null
  let pairedPartsOrderId: string | null = null

  if (existingJobNum) {
    // ── Link to existing job ──
    const found = await prisma.job.findFirst({
      where: { num: { equals: existingJobNum, mode: 'insensitive' } },
    })
    if (!found) {
      return NextResponse.json({ error: `Job "${existingJobNum}" not found` }, { status: 404 })
    }
    job = found
    isExisting = true

    // Upsert delivery — update invoice amount for the revised quote
    const existingDelivery = await prisma.delivery.findFirst({ where: { jobId: job.id } })
    if (existingDelivery) {
      await prisma.delivery.update({
        where: { id: existingDelivery.id },
        data: { invoiceAmount: quote.overridePrice ?? quote.total },
      })
    } else {
      await prisma.delivery.create({
        data: {
          jobId: job.id,
          jobNum: job.num,
          customer: quote.customerName,
          type: typeStr,
          invoiceAmount: quote.overridePrice ?? quote.total,
          paymentStatus: 'pending',
        },
      })
    }
  } else if (isPairedQuote) {
    // ── Create paired truck + trailer jobs (truck gets lower number) ──
    const cfg = quote.configuration as Record<string, any>
    let truckNum: string
    let trailerNum: string
    if (customJobNum) {
      truckNum = customJobNum
      // Ensure trailer number is unique — must be higher than both the existing
      // max AND the custom truck number, otherwise we'd collide when creating the
      // trailer Job record (customJobNum isn't in the DB yet when nextJobNumbers
      // runs).
      const [gen] = await nextJobNumbers(1)
      const truckN = parseInt(customJobNum.match(/(\d+)$/)?.[1] || '0', 10)
      const genN = parseInt(gen.match(/(\d+)$/)?.[1] || '0', 10)
      const trailerN = Math.max(truckN + 1, genN)
      trailerNum = `YLZ${trailerN}`
    } else {
      [truckNum, trailerNum] = await nextJobNumbers(2)
    }

    // Auto-generate trailer VIN
    const trailerModel = cfg.trailerConfig?.trailerModel || cfg.trailerModel || 'DT-4 (4-Axle Dog)'
    const generatedTrailerVin = await nextTrailerVin(trailerModel)
    const updatedTrailerCfg = { ...cfg.trailerConfig, vin: generatedTrailerVin }
    await prisma.quote.update({
      where: { id: params.id },
      data: { configuration: { ...cfg, trailerConfig: updatedTrailerCfg } },
    })
    const chassisMake  = cfg.chassisMake  || cfg.truckConfig?.chassisMake  || ''
    const chassisModel = cfg.chassisModel || cfg.truckConfig?.chassisModel || ''
    const makeStr = [chassisMake, chassisModel].filter(Boolean).join(' ')

    const truckTypeStr = truckOnlyTypeString(quote as any)
    const trailerTypeStr = trailerOnlyTypeString(quote as any)
    const truckBtype = deriveBtype(truckTypeStr)
    const trailerBtype = deriveBtype(trailerTypeStr)

    const truckJob = await prisma.job.create({
      data: {
        num: truckNum,
        type: truckTypeStr,
        customer: quote.customerName,
        dealer: quote.dealerName,
        stage: 'Requires Engineering',
        prodGroup: 'pending',
        btype: truckBtype,
        make: makeStr,
        notes: quote.notes || '',
        sortOrder: 0,
      },
    })

    const trailerJob = await prisma.job.create({
      data: {
        num: trailerNum,
        type: trailerTypeStr,
        customer: quote.customerName,
        dealer: quote.dealerName,
        stage: 'Requires Engineering',
        prodGroup: 'pending',
        btype: trailerBtype,
        make: '',
        vin: generatedTrailerVin,
        notes: quote.notes || '',
        sortOrder: 0,
        pairedId: truckJob.id,
      },
    })

    await prisma.job.update({
      where: { id: truckJob.id },
      data: { pairedId: trailerJob.id },
    })

    // BOM resolution — attach to truck job (combined list)
    try {
      const quoteConfig = (quote.configuration && typeof quote.configuration === 'object')
        ? quote.configuration as Record<string, unknown>
        : {}
      const bomList = resolveBoms(quote.buildType, quoteConfig)
      if (bomList.length > 0) {
        await prisma.job.update({
          where: { id: truckJob.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { bomList: bomList as any },
        })
      }
    } catch (bomErr) {
      console.error('[BOM Resolver] Failed to resolve BOMs:', bomErr)
    }

    // Auto-create VIN plate record for the trailer
    try {
      const tCfg = cfg.trailerConfig || cfg
      const matRaw: string = (tCfg.material || '').toLowerCase()
      const matType = matRaw.includes('alloy') ? 'ALLY' : matRaw.includes('hardox') ? 'HARDOX' : (tCfg.material || '').toUpperCase()
      const axleCount = tCfg.axles ? `${tCfg.axles} AXLE` : ''
      await prisma.vinPlateRecord.create({
        data: {
          vin: generatedTrailerVin,
          jobNumber: trailerJob.num,
          customer: quote.customerName,
          type: matType,
          axleType: axleCount,
          hubConfiguration: '',
          notes: 'PLATE NEEDED',
        },
      })
    } catch { /* non-fatal */ }

    await prisma.jobMaster.upsert({
      where: { jobNumber: truckJob.num },
      update: { jobType: btypeToJobMasterType(truckBtype), customer: quote.customerName },
      create: { jobNumber: truckJob.num, jobType: btypeToJobMasterType(truckBtype), customer: quote.customerName },
    })
    await prisma.jobMaster.upsert({
      where: { jobNumber: trailerJob.num },
      update: { jobType: btypeToJobMasterType(trailerBtype), customer: quote.customerName },
      create: { jobNumber: trailerJob.num, jobType: btypeToJobMasterType(trailerBtype), customer: quote.customerName },
    })

    await prisma.jobFile.create({
      data: {
        jobId: truckJob.id,
        fileName: `Job Sheets — ${truckJob.num}.pdf`,
        fileType: 'generated/jsheet',
        filePath: `jsheet:${truckJob.id}`,
        fileSize: 0,
        uploadedBy: 'system',
      },
    })
    await prisma.jobFile.create({
      data: {
        jobId: trailerJob.id,
        fileName: `Job Sheets — ${trailerJob.num}.pdf`,
        fileType: 'generated/jsheet',
        filePath: `jsheet:${trailerJob.id}`,
        fileSize: 0,
        uploadedBy: 'system',
      },
    })

    // Full invoice on truck job only (review later)
    await prisma.delivery.create({
      data: {
        jobId: truckJob.id,
        jobNum: truckJob.num,
        customer: quote.customerName,
        type: `${truckTypeStr} + ${trailerTypeStr}`,
        invoiceAmount: quote.overridePrice ?? quote.total,
        paymentStatus: 'pending',
      },
    })

    // Two separate parts orders so they can be ordered independently
    const truckPartsOrder = await prisma.partsOrder.create({
      data: {
        jobId: truckJob.id,
        jobNum: truckJob.num,
        quoteId: quote.id,
        status: 'draft',
        notes: `Auto-created from quote ${quote.quoteNumber} (truck body portion). Review and send to suppliers.\n\nBuild: ${truckTypeStr}\nCustomer: ${quote.customerName}\nPaired with trailer: ${trailerJob.num}`,
      },
    })
    const trailerPartsOrder = await prisma.partsOrder.create({
      data: {
        jobId: trailerJob.id,
        jobNum: trailerJob.num,
        quoteId: quote.id,
        status: 'draft',
        notes: `Auto-created from quote ${quote.quoteNumber} (trailer portion). Review and send to suppliers.\n\nBuild: ${trailerTypeStr}\nCustomer: ${quote.customerName}\nPaired with truck: ${truckJob.num}`,
      },
    })

    job = truckJob
    pairedJob = trailerJob
    partsOrderId = truckPartsOrder.id
    pairedPartsOrderId = trailerPartsOrder.id
  } else {
    // ── Create new job ──
    const cfg = quote.configuration as Record<string, any>
    const jobNumber = customJobNum || await nextJobNumber()
    const chassisMake  = cfg.chassisMake  || cfg.truckConfig?.chassisMake  || ''
    const chassisModel = cfg.chassisModel || cfg.truckConfig?.chassisModel || ''
    const makeStr = [chassisMake, chassisModel].filter(Boolean).join(' ')

    // Auto-generate trailer VIN for trailer builds
    const isTrailerBuild = ['ally-trailer', 'hardox-trailer', 'dolly', 'tag-trailer'].includes(btype)
    let singleTrailerVin = ''
    if (isTrailerBuild) {
      const trailerModel = cfg.trailerModel || 'DT-4 (4-Axle Dog)'
      singleTrailerVin = await nextTrailerVin(trailerModel)
      await prisma.quote.update({
        where: { id: params.id },
        data: { configuration: { ...cfg, vin: singleTrailerVin } },
      })
    }

    job = await prisma.job.create({
      data: {
        num: jobNumber,
        type: typeStr,
        customer: quote.customerName,
        dealer: quote.dealerName,
        stage: 'Requires Engineering',
        prodGroup: 'pending',
        btype,
        make: makeStr,
        vin: singleTrailerVin || '',
        notes: quote.notes || '',
        sortOrder: 0,
      },
    })

    // ── Resolve BOMs from quote configuration ──
    try {
      const quoteConfig = (quote.configuration && typeof quote.configuration === 'object')
        ? quote.configuration as Record<string, unknown>
        : {}
      const bomList = resolveBoms(quote.buildType, quoteConfig)
      if (bomList.length > 0) {
        await prisma.job.update({
          where: { id: job.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { bomList: bomList as any },
        })
      }
    } catch (bomErr) {
      console.error('[BOM Resolver] Failed to resolve BOMs:', bomErr)
      // Non-fatal — job still created, BOMs just won't be auto-populated
    }

    // Auto-create VIN plate record for trailer builds
    if (isTrailerBuild && singleTrailerVin) {
      try {
        const matRaw: string = (cfg.material || '').toLowerCase()
        const matType = matRaw.includes('alloy') ? 'ALLY' : matRaw.includes('hardox') ? 'HARDOX' : (cfg.material || '').toUpperCase()
        const axleCount = cfg.axles ? `${cfg.axles} AXLE` : ''
        await prisma.vinPlateRecord.create({
          data: {
            vin: singleTrailerVin,
            jobNumber: job.num,
            customer: quote.customerName,
            type: matType,
            axleType: axleCount,
            hubConfiguration: '',
            notes: 'PLATE NEEDED',
          },
        })
      } catch { /* non-fatal */ }
    }

    await prisma.jobMaster.upsert({
      where: { jobNumber: job.num },
      update: { jobType: btypeToJobMasterType(btype), customer: quote.customerName },
      create: { jobNumber: job.num, jobType: btypeToJobMasterType(btype), customer: quote.customerName },
    })

    await prisma.jobFile.create({
      data: {
        jobId: job.id,
        fileName: `Job Sheets — ${job.num}.pdf`,
        fileType: 'generated/jsheet',
        filePath: `jsheet:${job.id}`,
        fileSize: 0,
        uploadedBy: 'system',
      },
    })

    await prisma.delivery.create({
      data: {
        jobId: job.id,
        jobNum: job.num,
        customer: quote.customerName,
        type: typeStr,
        invoiceAmount: quote.overridePrice ?? quote.total,
        paymentStatus: 'pending',
      },
    })

    const partsOrder = await prisma.partsOrder.create({
      data: {
        jobId: job.id,
        jobNum: job.num,
        quoteId: quote.id,
        status: 'draft',
        notes: `Auto-created from quote ${quote.quoteNumber}. Review and send to suppliers.\n\nBuild: ${typeStr}\nCustomer: ${quote.customerName}`,
      },
    })
    partsOrderId = partsOrder.id
  }

  // ── Update quote status + link to job ──
  await prisma.quote.update({
    where: { id: params.id },
    data: { status: 'accepted', acceptedAt: new Date(), jobId: job.id },
  })

  // ── Kick-off agent (non-fatal) ──
  if (!isExisting) {
    const bt = (quote.buildType || '').toLowerCase()
    if (isPairedQuote && pairedJob) {
      runKickoffAgent(job.id, params.id).catch(err =>
        console.error('[Kickoff Agent] Failed (truck):', err)
      )
      runTrailerKickoffAgent(pairedJob.id, params.id).catch(err =>
        console.error('[Trailer Kickoff Agent] Failed:', err)
      )
    } else if (bt === 'trailer') {
      runTrailerKickoffAgent(job.id, params.id).catch(err =>
        console.error('[Trailer Kickoff Agent] Failed:', err)
      )
    } else {
      runKickoffAgent(job.id, params.id).catch(err =>
        console.error('[Kickoff Agent] Failed:', err)
      )
    }
  }

  // ── Send workshop email ──
  const displayJobNumber = pairedJob ? `${job.num} (truck) + ${pairedJob.num} (trailer)` : job.num
  const emailResult = await sendWorkshopEmail({
    quoteNumber: quote.quoteNumber,
    jobNumber: displayJobNumber,
    customer: quote.customerName,
    buildType: typeStr,
    quoteId: quote.id,
    preparedBy: quote.preparedBy,
    baseUrl: origin,
  })

  // ── Notify Pete + Nathan ──
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const fromEmail = process.env.FROM_EMAIL || 'noreply@ylztrucks.com.au'
      const peteEmail = process.env.PETE_EMAIL || 'pete@ylztruckbodies.com.au'
      const nathanEmail = process.env.NATHAN_EMAIL || 'nathan@ylztruckbodies.com.au'
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px">
          <div style="background:#22c55e;padding:16px 24px;border-radius:6px 6px 0 0">
            <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px">🎉 YLZ — Quote Accepted</span>
          </div>
          <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 6px 6px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr><td style="padding:8px 0;color:#666;font-size:13px;width:160px">Quote</td><td style="font-weight:700;font-size:15px">${quote.quoteNumber}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Job Number</td><td style="font-weight:700;font-size:15px;color:#E8681A">${pairedJob ? `${job.num} (truck) + ${pairedJob.num} (trailer)` : `${job.num}${isExisting ? ' (existing)' : ''}`}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Customer</td><td style="font-weight:600">${quote.customerName}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Build Type</td><td style="font-weight:600">${typeStr}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Prepared By</td><td>${quote.preparedBy}</td></tr>
            </table>
            <a href="${origin}/quotes/builder?id=${quote.id}" style="background:#E8681A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:700;font-size:13px">View Quote</a>
          </div>
        </div>
      `
      await resend.emails.send({
        from: fromEmail,
        to: [peteEmail, nathanEmail],
        subject: `Quote Accepted: ${quote.quoteNumber} — ${quote.customerName} → ${pairedJob ? `${job.num} + ${pairedJob.num}` : job.num}`,
        html,
      })
    } catch {
      // graceful failure
    }
  }

  // ── Notify Keith + Dom if build has a liner (tipper tarps need arranging) ──
  console.log('[liner-email] starting check for quote', quote.quoteNumber, 'buildType:', quote.buildType, 'apiKey set:', !!apiKey)
  if (apiKey) {
    try {
      const cfg = (quote.configuration ?? {}) as Record<string, any>
      const bt = (quote.buildType || '').toLowerCase()
      const linerSections: { label: string; bodyLength: string; jobNum: string }[] = []
      if (bt === 'truck-and-trailer') {
        const tc = cfg.truckConfig || {}
        const trc = cfg.trailerConfig || {}
        console.log('[liner-email] truck-and-trailer — truckConfig.liner:', tc.liner, 'trailerConfig.liner:', trc.liner)
        if (tc.liner === 'Yes') linerSections.push({ label: 'Truck Body', bodyLength: tc.bodyLength || '', jobNum: job.num })
        if (trc.liner === 'Yes') linerSections.push({ label: 'Trailer', bodyLength: trc.bodyLength || '', jobNum: pairedJob?.num || job.num })
      } else if (bt === 'truck-body') {
        console.log('[liner-email] truck-body — cfg.liner:', cfg.liner)
        if (cfg.liner === 'Yes') linerSections.push({ label: 'Truck Body', bodyLength: cfg.bodyLength || '', jobNum: job.num })
      } else if (bt === 'trailer') {
        console.log('[liner-email] trailer — cfg.liner:', cfg.liner)
        if (cfg.liner === 'Yes') linerSections.push({ label: 'Trailer', bodyLength: cfg.bodyLength || '', jobNum: job.num })
      } else {
        console.log('[liner-email] buildType not handled:', bt)
      }

      if (linerSections.length > 0) {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)
        const fromEmail = process.env.FROM_EMAIL || 'noreply@ylztrucks.com.au'
        const keithEmail = process.env.KEITH_EMAIL || 'workshop@ylztruckbodies.com'
        const domEmail = process.env.DOM_EMAIL || 'domenic@ylztruckbodies.com'
        const sectionRows = linerSections.map(s => `
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;width:160px">${s.label}</td>
            <td style="font-weight:600">Job ${s.jobNum}${s.bodyLength ? ` — ${s.bodyLength}mm body` : ''}</td>
          </tr>`).join('')
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px">
            <div style="background:#E8681A;padding:16px 24px;border-radius:6px 6px 0 0">
              <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px">YLZ — Liner build accepted (tipper tarp required)</span>
            </div>
            <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 6px 6px">
              <p style="margin:0 0 16px;font-size:14px">Quote <strong>${quote.quoteNumber}</strong> for <strong>${quote.customerName}</strong> has been accepted and includes a liner. Please arrange tipper tarps for the section(s) below when booking the job in.</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
                <tr><td style="padding:8px 0;color:#666;font-size:13px;width:160px">Quote</td><td style="font-weight:700;font-size:15px">${quote.quoteNumber}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:13px">Customer</td><td style="font-weight:600">${quote.customerName}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:13px">Build Type</td><td style="font-weight:600">${typeStr}</td></tr>
                ${sectionRows}
              </table>
              <a href="${origin}/quotes/builder?id=${quote.id}" style="background:#E8681A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:700;font-size:13px">View Quote</a>
            </div>
          </div>
        `
        const sectionLabels = linerSections.map(s => s.label).join(' + ')
        console.log('[liner-email] sending to', keithEmail, domEmail, 'sections:', sectionLabels)
        const result = await resend.emails.send({
          from: fromEmail,
          to: [keithEmail, domEmail],
          subject: `Liner build accepted — ${quote.quoteNumber} (${sectionLabels}) — tipper tarp required`,
          html,
        })
        console.log('[liner-email] resend result:', JSON.stringify(result))
      } else {
        console.log('[liner-email] no liner sections found — skipping email')
      }
    } catch (err) {
      console.error('[liner-email] failed:', err)
    }
  } else {
    console.log('[liner-email] skipped — RESEND_API_KEY not set')
  }

  return NextResponse.json({
    ok: true,
    job: { id: job.id, num: job.num },
    pairedJob: pairedJob ? { id: pairedJob.id, num: pairedJob.num } : null,
    isExisting,
    partsOrderId,
    pairedPartsOrderId,
    email: emailResult,
  }, { status: 200 })
}
