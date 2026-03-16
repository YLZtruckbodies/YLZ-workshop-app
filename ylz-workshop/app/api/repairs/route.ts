import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function getNextNum(type: string): Promise<string> {
  const prefix = type === 'Warranty' ? 'YLZ WAR' : 'YLZ REP'
  const existing = await prisma.repairJob.findMany({
    where: { type },
    select: { num: true },
    orderBy: { num: 'desc' },
  })

  let max = 0
  for (const r of existing) {
    const match = r.num.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > max) max = n
    }
  }

  const next = (max + 1).toString().padStart(2, '0')
  return `${prefix}${next}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const q = searchParams.get('q')

  const where: any = {}
  if (status) where.status = status
  if (type) where.type = type
  if (q) {
    where.OR = [
      { num: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  const repairs = await prisma.repairJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(repairs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const num = await getNextNum(body.type)

  const repair = await prisma.repairJob.create({
    data: {
      num,
      type: body.type,
      description: body.description || '',
      status: body.status || 'Open',
      dateReported: body.dateReported || '',
      dateCompleted: body.dateCompleted || '',
      createdBy: body.createdBy || '',
    },
  })
  return NextResponse.json(repair, { status: 201 })
}
