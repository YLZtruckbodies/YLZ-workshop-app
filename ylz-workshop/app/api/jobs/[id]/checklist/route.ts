import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/jobs/[id]/checklist?stage=QC
// Returns merged checklist: template items + per-job completion state
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const stage = req.nextUrl.searchParams.get('stage')
  if (!stage) return NextResponse.json({ error: 'stage required' }, { status: 400 })

  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { num: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [templates, checks] = await Promise.all([
    prisma.checklistTemplate.findMany({
      where: { stage, active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.jobFollowerCheck.findMany({
      where: { jobNum: job.num, stage },
    }),
  ])

  const checkMap = new Map(checks.map((c) => [c.checkKey, c]))

  const items = templates.map((t) => {
    const check = checkMap.get(t.id)
    return {
      templateId: t.id,
      label: t.label,
      description: t.description,
      required: t.required,
      checked: check?.checked ?? false,
      checkedBy: check?.checkedBy ?? '',
      checkedAt: check?.checkedAt ?? null,
    }
  })

  return NextResponse.json({ stage, items })
}

// PATCH /api/jobs/[id]/checklist — update a single check
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { templateId, checked, checkedBy = '' } = body

  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { num: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const template = await prisma.checklistTemplate.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const result = await prisma.jobFollowerCheck.upsert({
    where: { jobNum_checkKey: { jobNum: job.num, checkKey: templateId } },
    create: {
      jobNum: job.num,
      checkKey: templateId,
      stage: template.stage,
      checked,
      checkedBy,
      checkedAt: checked ? new Date() : null,
    },
    update: {
      checked,
      checkedBy,
      checkedAt: checked ? new Date() : null,
    },
  })

  return NextResponse.json(result)
}
