import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { type, ...data } = body

  try {
    if (type === 'injury') {
      const record = await prisma.whsInjury.update({ where: { id: params.id }, data })
      return NextResponse.json(record)
    }
    if (type === 'audit') {
      const record = await prisma.whsAudit.update({ where: { id: params.id }, data })
      return NextResponse.json(record)
    }
    if (type === 'nearmiss') {
      const record = await prisma.whsNearMiss.update({ where: { id: params.id }, data })
      return NextResponse.json(record)
    }
    if (type === 'timeoff') {
      const record = await prisma.whsTimeOff.update({ where: { id: params.id }, data })
      return NextResponse.json(record)
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'injury'

  try {
    if (type === 'injury') await prisma.whsInjury.delete({ where: { id: params.id } })
    else if (type === 'audit') await prisma.whsAudit.delete({ where: { id: params.id } })
    else if (type === 'nearmiss') await prisma.whsNearMiss.delete({ where: { id: params.id } })
    else if (type === 'timeoff') await prisma.whsTimeOff.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
