import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default chassis entries â seeded on first request if table is empty
const DEFAULT_CHASSIS = [
  { make: 'UD', model: 'Quon GW 26 460 KAA', seatingCapacity: '2', gvm: '26000', gcm: '60000', frontAxleRating: '8200', rearAxleRating: '21000' },
  { make: 'Isuzu', model: 'FRR 110-260', seatingCapacity: '3', gvm: '11000', gcm: '20000', frontAxleRating: '4400', rearAxleRating: '7700' },
  { make: 'Isuzu', model: 'FVZ 260-300', seatingCapacity: '3', gvm: '24000', gcm: '36000', frontAxleRating: '7100', rearAxleRating: '13400' },
  { make: 'Isuzu', model: 'FYJ 300-350', seatingCapacity: '2', gvm: '30000', gcm: '50000', frontAxleRating: '7500', rearAxleRating: '21000' },
  { make: 'Hino', model: 'FD 1124', seatingCapacity: '3', gvm: '11000', gcm: '18000', frontAxleRating: '4200', rearAxleRating: '7500' },
  { make: 'Hino', model: 'FM 2628', seatingCapacity: '2', gvm: '26000', gcm: '55000', frontAxleRating: '7100', rearAxleRating: '21000' },
  { make: 'Fuso', model: 'Fighter 1627', seatingCapacity: '3', gvm: '16000', gcm: '26000', frontAxleRating: '5500', rearAxleRating: '11500' },
  { make: 'Fuso', model: 'Shogun FV54', seatingCapacity: '2', gvm: '25000', gcm: '55000', frontAxleRating: '7500', rearAxleRating: '21000' },
  { make: 'Mercedes-Benz', model: 'Actros 2653', seatingCapacity: '2', gvm: '26000', gcm: '55000', frontAxleRating: '7500', rearAxleRating: '21000' },
  { make: 'Volvo', model: 'FM 460', seatingCapacity: '2', gvm: '26000', gcm: '60000', frontAxleRating: '8000', rearAxleRating: '21000' },
  { make: 'Kenworth', model: 'T410', seatingCapacity: '2', gvm: '26000', gcm: '60000', frontAxleRating: '7500', rearAxleRating: '21000' },
]

async function seedIfEmpty() {
  const count = await prisma.vassChassis.count()
  if (count === 0) {
    await prisma.vassChassis.createMany({ data: DEFAULT_CHASSIS })
  }
}

export async function GET(req: NextRequest) {
  try {
    await seedIfEmpty()

    const { searchParams } = new URL(req.url)
    const make = searchParams.get('make')

    const where: any = {}
    if (make) where.make = make

    const chassis = await prisma.vassChassis.findMany({
      where,
      orderBy: [{ make: 'asc' }, { model: 'asc' }],
    })
    return NextResponse.json(chassis)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch chassis data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = await prisma.vassChassis.create({ data: body })
    return NextResponse.json(entry, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create chassis entry' }, { status: 500 })
  }
}
