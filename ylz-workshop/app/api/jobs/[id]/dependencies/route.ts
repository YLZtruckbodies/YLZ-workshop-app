import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deps = await prisma.jobDependency.findMany({
    where: { jobId: params.id },
  })
  if (!deps.length) return NextResponse.json([])

  const blockerIds = deps.map((d) => d.blockedById)
  const blockers = await prisma.job.findMany({
    where: { id: { in: blockerIds } },
    select: { id: true, num: true, type: true, customer: true, stage: true },
  })

  return NextResponse.json(blockers)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const dep = await prisma.jobDependency.create({
    data: { jobId: params.id, blockedById: body.blockedById },
  })
  return NextResponse.json(dep, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const blockedById = searchParams.get('blockedById')
  if (!blockedById) return NextResponse.json({ error: 'blockedById required' }, { status: 400 })
  await prisma.jobDependency.deleteMany({
    where: { jobId: params.id, blockedById },
  })
  return NextResponse.json({ ok: true })
}
