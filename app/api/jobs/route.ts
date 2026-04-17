import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const prodGroup = searchParams.get('prodGroup')
  const search = searchParams.get('q')
  const testMode = req.headers.get('X-Test-Mode') === 'true'

  const where: any = { isTest: testMode }
  if (stage) where.stage = stage
  if (prodGroup) where.prodGroup = prodGroup
  if (search) {
    where.OR = [
      { num: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
      { customer: { contains: search, mode: 'insensitive' } },
      { dealer: { contains: search, mode: 'insensitive' } },
    ]
  }

  const jobs = await prisma.job.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { num: 'asc' }] })
  return NextResponse.json(jobs)
}

function btypeToJobType(btype: string): string {
  if (btype === 'ally-trailer' || btype === 'hardox-trailer') return 'TRAILER'
  if (btype === 'wheelbase') return 'WHEELBASE'
  if (btype === 'dolly') return 'CONVERTER DOLLY'
  return 'TRUCK'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const job = await prisma.job.create({ data: body })

  // Upsert into JobMaster so it stays in sync
  await prisma.jobMaster.upsert({
    where: { jobNumber: job.num },
    update: {
      jobType: btypeToJobType(job.btype || ''),
      customer: job.customer || '',
    },
    create: {
      jobNumber: job.num,
      jobType: btypeToJobType(job.btype || ''),
      customer: job.customer || '',
    },
  })

  // Auto-create generated job sheet attachment record
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

  return NextResponse.json(job, { status: 201 })
}
