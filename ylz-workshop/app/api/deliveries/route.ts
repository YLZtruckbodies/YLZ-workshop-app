import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['pending', 'deposit-paid', 'invoiced', 'paid', 'overdue']

export async function GET() {
  try {
    const [jobs, deliveries] = await Promise.all([
      prisma.job.findMany({
        where: { OR: [{ stage: { in: ['QC', 'Dispatch'] } }, { prodGroup: 'finished' }] },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.delivery.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const deliveryMap: Record<string, any> = {}
    for (const d of deliveries) {
      deliveryMap[d.jobId] = d
    }

    const merged = jobs.map((job) => ({
      job,
      delivery: deliveryMap[job.id] || null,
    }))

    return NextResponse.json({ merged, deliveries })
  } catch (err) {
    console.error('GET /api/deliveries error:', err)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    const body = await req.json()

    // Sanitise numeric fields
    const invoiceAmount = Math.max(0, Number(body.invoiceAmount) || 0)
    const depositAmount = Math.max(0, Number(body.depositAmount) || 0)
    const paymentStatus = VALID_STATUSES.includes(body.paymentStatus) ? body.paymentStatus : 'pending'

    // === APPROVAL FLOW ===
    if (body.approve && body.jobId) {
      if (!user?.canAdvance && !user?.fullAdmin) {
        return NextResponse.json({ error: 'No permission to approve jobs' }, { status: 403 })
      }

      const jobId = String(body.jobId)

      // Verify job exists and is in QC
      const job = await prisma.job.findUnique({ where: { id: jobId } })
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      if (job.stage !== 'QC') return NextResponse.json({ error: 'Job is not in QC stage' }, { status: 400 })

      // Atomic transaction: upsert delivery + advance job + advance paired
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.delivery.findFirst({ where: { jobId } })
        const deliveryData = {
          jobNum: String(body.jobNum || job.num),
          customer: String(body.customer || job.customer || ''),
          type: String(body.type || job.type || ''),
          invoiceNum: String(body.invoiceNum || ''),
          invoiceAmount,
          depositAmount,
          depositPaid: Boolean(body.depositPaid),
          deliveryDate: String(body.deliveryDate || ''),
          paymentDue: String(body.paymentDue || ''),
          paymentStatus: paymentStatus === 'pending' ? 'invoiced' : paymentStatus,
          notes: String(body.notes || ''),
        }

        let delivery
        if (existing) {
          delivery = await tx.delivery.update({ where: { id: existing.id }, data: deliveryData })
        } else {
          delivery = await tx.delivery.create({ data: { jobId, ...deliveryData } })
        }

        const updatedJob = await tx.job.update({ where: { id: jobId }, data: { stage: 'Dispatch' } })

        // Advance paired job if it exists and is also in QC
        if (updatedJob.pairedId) {
          const paired = await tx.job.findUnique({ where: { id: updatedJob.pairedId } })
          if (paired && paired.stage === 'QC') {
            await tx.job.update({ where: { id: updatedJob.pairedId }, data: { stage: 'Dispatch' } })
          }
        }

        return { delivery, job: updatedJob }
      })

      return NextResponse.json(result, { status: 200 })
    }

    // === SAVE DETAILS (no approval) ===
    if (body.jobId) {
      if (!user?.canEdit && !user?.fullAdmin) {
        return NextResponse.json({ error: 'No permission to edit' }, { status: 403 })
      }

      const jobId = String(body.jobId)
      const job = await prisma.job.findUnique({ where: { id: jobId } })
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

      const deliveryData = {
        jobNum: String(body.jobNum || job.num),
        customer: String(body.customer || job.customer || ''),
        type: String(body.type || job.type || ''),
        invoiceNum: String(body.invoiceNum || ''),
        invoiceAmount,
        depositAmount,
        depositPaid: Boolean(body.depositPaid),
        deliveryDate: String(body.deliveryDate || ''),
        paymentDue: String(body.paymentDue || ''),
        paymentStatus,
        notes: String(body.notes || ''),
      }

      const existing = await prisma.delivery.findFirst({ where: { jobId } })
      if (existing) {
        const delivery = await prisma.delivery.update({ where: { id: existing.id }, data: deliveryData })
        return NextResponse.json(delivery)
      }

      const delivery = await prisma.delivery.create({ data: { jobId, ...deliveryData } })
      return NextResponse.json(delivery, { status: 201 })
    }

    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/deliveries error:', err)
    return NextResponse.json({ error: 'Failed to process delivery' }, { status: 500 })
  }
}
