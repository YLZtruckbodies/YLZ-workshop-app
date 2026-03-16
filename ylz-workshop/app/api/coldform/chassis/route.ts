import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const chassis = await prisma.coldformChassis.findMany({
    orderBy: { position: 'asc' },
  })
  return NextResponse.json(chassis)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (Array.isArray(body)) {
    const items = await prisma.$transaction(
      body.map((c: any, i: number) =>
        prisma.coldformChassis.create({
          data: {
            jobNo: c.jobNo || '',
            chassisLength: c.chassisLength || '',
            dollyType: c.dollyType || '',
            drawbar: c.drawbar || '',
            dateNeeded: c.dateNeeded || '',
            notes: c.notes || '',
            status: c.status || '',
            position: c.position ?? i,
          },
        })
      )
    )
    return NextResponse.json(items, { status: 201 })
  }

  const item = await prisma.coldformChassis.create({
    data: {
      jobNo: body.jobNo || '',
      chassisLength: body.chassisLength || '',
      dollyType: body.dollyType || '',
      drawbar: body.drawbar || '',
      dateNeeded: body.dateNeeded || '',
      notes: body.notes || '',
      status: body.status || '',
      position: body.position ?? 0,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
