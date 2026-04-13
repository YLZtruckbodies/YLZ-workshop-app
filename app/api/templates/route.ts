import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const active = searchParams.get('active')

  const where: any = {}
  if (category) where.category = category
  if (active !== null) where.active = active !== 'false'

  const templates = await prisma.productTemplate.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const template = await prisma.productTemplate.create({ data: body })
  return NextResponse.json(template, { status: 201 })
}
