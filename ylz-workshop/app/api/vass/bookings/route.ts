import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('q')

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { vehicleMake: { contains: search, mode: 'insensitive' } },
        { vehicleModel: { contains: search, mode: 'insensitive' } },
        { vinNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const bookings = await prisma.vassBooking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(bookings)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch VASS bookings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const booking = await prisma.vassBooking.create({ data: body })
    return NextResponse.json(booking, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create VASS booking' }, { status: 500 })
  }
}
