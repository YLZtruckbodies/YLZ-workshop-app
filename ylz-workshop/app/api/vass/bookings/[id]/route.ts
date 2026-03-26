import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const booking = await prisma.vassBooking.findUnique({ where: { id: params.id } })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(booking)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch booking' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const booking = await prisma.vassBooking.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(booking)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.vassBooking.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete booking' }, { status: 500 })
  }
}
