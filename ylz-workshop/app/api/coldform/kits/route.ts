import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const kits = await prisma.coldformKit.findMany({
    orderBy: { position: 'asc' },
  })
  return NextResponse.json(kits)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // If it's a bulk create (array), handle that
  if (Array.isArray(body)) {
    const kits = await prisma.$transaction(
      body.map((kit: any, i: number) =>
        prisma.coldformKit.create({
          data: {
            size: kit.size || '',
            walls: kit.walls || '',
            tunnel: kit.tunnel || '',
            floor: kit.floor || '',
            headBoard: kit.headBoard || '',
            tailGate: kit.tailGate || '',
            splashGuards: kit.splashGuards || '',
            lightStrips: kit.lightStrips || '',
            allocatedTo: kit.allocatedTo || '',
            notes: kit.notes || '',
            status: kit.status || '',
            position: kit.position ?? i,
          },
        })
      )
    )
    return NextResponse.json(kits, { status: 201 })
  }

  const kit = await prisma.coldformKit.create({
    data: {
      size: body.size || '',
      walls: body.walls || '',
      tunnel: body.tunnel || '',
      floor: body.floor || '',
      headBoard: body.headBoard || '',
      tailGate: body.tailGate || '',
      splashGuards: body.splashGuards || '',
      lightStrips: body.lightStrips || '',
      allocatedTo: body.allocatedTo || '',
      notes: body.notes || '',
      status: body.status || '',
      position: body.position ?? 0,
    },
  })
  return NextResponse.json(kit, { status: 201 })
}
