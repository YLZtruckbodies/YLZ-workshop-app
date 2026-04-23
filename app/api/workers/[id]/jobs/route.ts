import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncWorkerToSheet } from '@/lib/sheets'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const jobs = await prisma.workerJob.findMany({
    where: { workerId: params.id },
    orderBy: { position: 'asc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const maxPos = await prisma.workerJob.findFirst({
    where: { workerId: params.id },
    orderBy: { position: 'desc' },
  })
  const job = await prisma.workerJob.create({
    data: {
      ...body,
      workerId: params.id,
      position: (maxPos?.position ?? -1) + 1,
    },
  })
  syncWorkerToSheet(params.id).catch((err) => console.error('Sheet sync error:', err))
  return NextResponse.json(job, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  // Bulk update worker jobs (reorder, update start/days)
  const { jobs } = body as { jobs: Array<{ id: string; jobNo?: string; type?: string; start?: string; days?: number; position?: number; done?: boolean }> }

  const updates = jobs.map((j, i) =>
    prisma.workerJob.update({
      where: { id: j.id },
      data: {
        jobNo: j.jobNo ?? undefined,
        type: j.type ?? undefined,
        start: j.start ?? undefined,
        days: j.days ?? undefined,
        position: j.position ?? i,
        done: j.done ?? undefined,
      },
    })
  )
  await prisma.$transaction(updates)

  const updated = await prisma.workerJob.findMany({
    where: { workerId: params.id },
    orderBy: { position: 'asc' },
  })
  syncWorkerToSheet(params.id).catch((err) => console.error('Sheet sync error:', err))
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  await prisma.workerJob.delete({ where: { id: jobId } })
  syncWorkerToSheet(params.id).catch((err) => console.error('Sheet sync error:', err))
  return NextResponse.json({ success: true })
}
