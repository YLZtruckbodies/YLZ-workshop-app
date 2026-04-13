import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const workers = await prisma.worker.findMany({
    include: { jobs: { orderBy: { position: 'asc' } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(workers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jobs, ...workerData } = body
  const worker = await prisma.worker.create({
    data: {
      ...workerData,
      jobs: jobs ? { create: jobs } : undefined,
    },
    include: { jobs: true },
  })
  return NextResponse.json(worker, { status: 201 })
}
