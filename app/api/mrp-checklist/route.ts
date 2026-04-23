import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/mrp-checklist — list all checklists (or single by ?jobId=)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      const checklist = await prisma.mrpChecklist.findUnique({
        where: { jobId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      })
      if (!checklist) return NextResponse.json(null)
      return NextResponse.json(checklist)
    }

    const status = searchParams.get('status')
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const checklists = await prisma.mrpChecklist.findMany({
      where,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(checklists)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/mrp-checklist — create a checklist with items
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { jobId, jobNum, customer, items } = body as {
      jobId: string
      jobNum: string
      customer?: string
      items?: Array<{ section: string; label?: string; details?: Record<string, unknown>; notes?: string }>
    }

    if (!jobId || !jobNum) {
      return NextResponse.json({ error: 'jobId and jobNum required' }, { status: 400 })
    }

    // Upsert — return existing if it already exists
    const existing = await prisma.mrpChecklist.findUnique({
      where: { jobId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (existing) return NextResponse.json(existing)

    const checklist = await prisma.mrpChecklist.create({
      data: {
        jobId,
        jobNum: jobNum || '',
        customer: customer || '',
        items: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: (items || []).map((item, i) => ({
            section: item.section,
            label: item.label || '',
            details: (item.details || {}) as any,
            notes: item.notes || '',
            sortOrder: i,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json(checklist, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
