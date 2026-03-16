import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const deliveries = await prisma.coldformDelivery.findMany({
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(deliveries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (Array.isArray(body)) {
    const items = await prisma.$transaction(
      body.map((d: any) =>
        prisma.coldformDelivery.create({
          data: {
            date: d.date || '',
            hardoxJobs: d.hardoxJobs || '',
            chassisJobs: d.chassisJobs || '',
            alloyJobs: d.alloyJobs || '',
            notes: d.notes || '',
          },
        })
      )
    )
    return NextResponse.json(items, { status: 201 })
  }

  const item = await prisma.coldformDelivery.create({
    data: {
      date: body.date || '',
      hardoxJobs: body.hardoxJobs || '',
      chassisJobs: body.chassisJobs || '',
      alloyJobs: body.alloyJobs || '',
      notes: body.notes || '',
    },
  })
  return NextResponse.json(item, { status: 201 })
}
