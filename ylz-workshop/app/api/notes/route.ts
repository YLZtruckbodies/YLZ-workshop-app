import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const type = searchParams.get('type')
  const active = searchParams.get('active')

  const where: any = {}
  if (jobId) where.jobId = jobId
  if (type) where.type = type

  const notes = await prisma.jobNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // If active=true, return only holdups that don't have a matching "resolved" note
  if (active === 'true') {
    // Get all holdup notes
    const holdups = notes.filter((n) => n.type === 'holdup')
    // Get all resolved notes
    const resolved = notes.filter((n) => n.type === 'resolved')
    const resolvedJobIds = new Set(resolved.map((r) => r.jobId))

    // A holdup is active if no resolved note exists for the same job AFTER the holdup
    const activeHoldups = holdups.filter((h) => {
      const resolvedAfter = resolved.find(
        (r) => r.jobId === h.jobId && new Date(r.createdAt) > new Date(h.createdAt)
      )
      return !resolvedAfter
    })
    return NextResponse.json(activeHoldups)
  }

  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jobId, authorId, authorName, type, message } = body

  if (!jobId || !type || !message) {
    return NextResponse.json({ error: 'jobId, type, and message are required' }, { status: 400 })
  }

  const note = await prisma.jobNote.create({
    data: {
      jobId,
      authorId: authorId || 'system',
      authorName: authorName || 'System',
      type,
      message,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
