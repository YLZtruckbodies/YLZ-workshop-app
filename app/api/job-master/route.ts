import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const jobs = await prisma.jobMaster.findMany({
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(jobs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const job = await prisma.jobMaster.create({ data: body })
  return NextResponse.json(job, { status: 201 })
}
