import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const stage = req.nextUrl.searchParams.get('stage')
  const where = stage ? { stage, active: true } : { active: true }
  const templates = await prisma.checklistTemplate.findMany({
    where,
    orderBy: [{ stage: 'asc' }, { sortOrder: 'asc' }],
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { stage, label, description = '', required = true, sortOrder = 0 } = body
  if (!stage || !label) return NextResponse.json({ error: 'stage and label required' }, { status: 400 })

  const template = await prisma.checklistTemplate.create({
    data: { stage, label, description, required, sortOrder },
  })
  return NextResponse.json(template)
}
