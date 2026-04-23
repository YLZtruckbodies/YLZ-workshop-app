import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/mrp-checklist/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const checklist = await prisma.mrpChecklist.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(checklist)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/mrp-checklist/[id] — toggle ordered, update notes, etc.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as {
      itemId?: string
      ordered?: boolean
      orderedBy?: string
      notes?: string
      details?: Record<string, unknown>
    }

    if (body.itemId) {
      const update: Record<string, unknown> = {}
      if (typeof body.ordered === 'boolean') {
        update.ordered = body.ordered
        update.orderedAt = body.ordered ? new Date() : null
        update.orderedBy = body.ordered ? (body.orderedBy || '') : ''
      }
      if (typeof body.notes === 'string') update.notes = body.notes
      if (body.details) update.details = body.details

      const item = await prisma.mrpChecklistItem.update({
        where: { id: body.itemId },
        data: update,
      })

      // Update checklist status based on all items
      const checklist = await prisma.mrpChecklist.findUnique({
        where: { id: params.id },
        include: { items: true },
      })
      if (checklist) {
        const allOrdered = checklist.items.every(i => i.ordered)
        const anyOrdered = checklist.items.some(i => i.ordered)
        const newStatus = allOrdered ? 'complete' : anyOrdered ? 'in-progress' : 'pending'
        if (checklist.status !== newStatus) {
          await prisma.mrpChecklist.update({
            where: { id: params.id },
            data: { status: newStatus },
          })
        }
      }

      return NextResponse.json(item)
    }

    // Checklist-level update
    const checklist = await prisma.mrpChecklist.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(checklist)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
