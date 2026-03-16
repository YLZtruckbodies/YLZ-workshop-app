import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')
  const prodGroup = searchParams.get('prodGroup')
  const search = searchParams.get('q')

  const where: any = {}
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

export async function POST(req: NextRequest) {
  const body = await req.json()
  const job = await prisma.job.create({ data: body })
  return NextResponse.json(job, { status: 201 })
}
