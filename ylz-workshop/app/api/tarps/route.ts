import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const tarps = await prisma.tarp.findMany({ orderBy: { jobNo: 'asc' } })
  return NextResponse.json(tarps)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const tarp = await prisma.tarp.create({ data: body })
  return NextResponse.json(tarp, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const tarp = await prisma.tarp.update({ where: { id }, data })
  return NextResponse.json(tarp)
}
