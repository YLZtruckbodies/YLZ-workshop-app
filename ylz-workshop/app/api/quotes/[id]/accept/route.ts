import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deriveBtype } from '@/lib/jobTypes'
import { resolveBoms } from '@/lib/bom-resolver'

// ─── Job number generator — pulls next available from Job Sheet Master ────────
async function nextJobNumber(): Promise<string> {
  const [masters, jobs] = await Promise.all([
    prisma.jobMaster.findMany({ select: { jobNumber: true } }),
    prisma.job.findMany({ select: { num: true } }),
  ])

  let maxNum = 1093
  for (const j of masters) {
    const match = j.jobNumber.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }
  for (const j of jobs) {
    const match = j.num.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }

  const next = maxNum + 1
  return `YLZ${next}`
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
  if (quote.status === 'accepted') {
    return NextResponse.json({ error: 'Quote already accepted', jobId: quote.jobId }, { status: 409 })
  }

  const typeStr = jobTypeString(quote as any)
  const btype = deriveBtype(typeStr)
  const origin = req.headers.get('origin') || req.headers.get('x-forwarded-host') || 'http://localhost:3000'

  let job: { id: string; num: string }
  let isExisting = false
  let partsOrderId: string | null = null

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
  } else {
    // ── Create new job ──
    const cfg = quote.configuration as Record<string, any>
    const jobNumber = customJobNum || await nextJobNumber()
    const chassisMake  = cfg.chassisMake  || cfg.truckConfig?.chassisMake  || ''
    const chassisModel = cfg.chassisModel || cfg.truckConfig?.chassisModel || ''
    const makeStr = [chassisMake, chassisModel].filter(Boolean).join(' ')

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

  // ── Send workshop email ──
  const emailResult = await sendWorkshopEmail({
    quoteNumber: quote.quoteNumber,
    jobNumber: job.num,
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
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Job Number</td><td style="font-weight:700;font-size:15px;color:#E8681A">${job.num}${isExisting ? ' (existing)' : ''}</td></tr>
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
        subject: `Quote Accepted: ${quote.quoteNumber} — ${quote.customerName} → ${job.num}`,
        html,
      })
    } catch {
      // graceful failure
    }
  }

  return NextResponse.json({
    ok: true,
    job: { id: job.id, num: job.num },
    isExisting,
    partsOrderId,
    email: emailResult,
  }, { status: 200 })
}
