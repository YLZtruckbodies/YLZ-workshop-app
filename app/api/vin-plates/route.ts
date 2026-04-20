import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')

    const where: any = {}
    if (search) {
      where.OR = [
        { vin: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { customer: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ]
    }

    const records = await prisma.vinPlateRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(records)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch VIN plate records' }, { status: 500 })
  }
}

export async function PATCH() {
  try {
    await prisma.vinPlateRecord.updateMany({
      data: { vinPlateOrdered: true, vinPlateReceived: true, roverInput: true },
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const record = await prisma.vinPlateRecord.create({ data: body })
    return NextResponse.json(record, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create VIN plate record' }, { status: 500 })
  }
}
