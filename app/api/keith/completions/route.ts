import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Returns jobs Keith has marked done but Liz hasn't yet processed in MRP
export async function GET() {
  const jobs = await (prisma.workerJob as any).findMany({
    where: { done: true, mrpProcessed: false },
    include: { worker: { select: { name: true, section: true, hdr: true } } },
    orderBy: { completedAt: 'desc' },
  })
  return NextResponse.json(jobs)
}

// Liz marks a completion as processed in MRP
export async function PATCH(req: NextRequest) {
  const { id } = await req.json() as { id: string }
  const updated = await (prisma.workerJob as any).update({
    where: { id },
    data: { mrpProcessed: true },
  })
  return NextResponse.json(updated)
}
