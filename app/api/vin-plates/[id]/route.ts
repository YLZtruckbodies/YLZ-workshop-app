import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const record = await prisma.vinPlateRecord.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(record)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.vinPlateRecord.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete record' }, { status: 500 })
  }
}
