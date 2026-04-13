import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'injury'
  const status = searchParams.get('status') || ''

  try {
    if (type === 'injury') {
      const where = status ? { status } : {}
      const data = await prisma.whsInjury.findMany({ where, orderBy: { createdAt: 'desc' } })
      return NextResponse.json(data)
    }
    if (type === 'audit') {
      const where = status ? { status } : {}
      const data = await prisma.whsAudit.findMany({ where, orderBy: { createdAt: 'desc' } })
      return NextResponse.json(data)
    }
    if (type === 'nearmiss') {
      const where = status ? { status } : {}
      const data = await prisma.whsNearMiss.findMany({ where, orderBy: { createdAt: 'desc' } })
      return NextResponse.json(data)
    }
    if (type === 'timeoff') {
      const where = status ? { status } : {}
      const data = await prisma.whsTimeOff.findMany({ where, orderBy: { createdAt: 'desc' } })
      return NextResponse.json(data)
    }
    return NextResponse.json([])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, ...data } = body

  try {
    if (type === 'injury') {
      const record = await prisma.whsInjury.create({ data })
      return NextResponse.json(record, { status: 201 })
    }
    if (type === 'audit') {
      const record = await prisma.whsAudit.create({ data })
      return NextResponse.json(record, { status: 201 })
    }
    if (type === 'nearmiss') {
      const record = await prisma.whsNearMiss.create({ data })
      return NextResponse.json(record, { status: 201 })
    }
    if (type === 'timeoff') {
      const record = await prisma.whsTimeOff.create({ data })
      return NextResponse.json(record, { status: 201 })
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
