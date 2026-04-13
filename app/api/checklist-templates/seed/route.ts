import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_TEMPLATES = [
  // QC stage
  { stage: 'QC', label: 'All welds inspected', sortOrder: 1 },
  { stage: 'QC', label: 'Body dimensions checked against spec', sortOrder: 2 },
  { stage: 'QC', label: 'All hardware fitted and torqued', sortOrder: 3 },
  { stage: 'QC', label: 'Hydraulics tested (hoist/tarp)', sortOrder: 4 },
  { stage: 'QC', label: 'Paint/finish inspected — no chips or runs', sortOrder: 5 },
  { stage: 'QC', label: 'Lights and electrics tested', sortOrder: 6 },
  { stage: 'QC', label: 'Body clean and presentable', sortOrder: 7 },
  // Dispatch stage
  { stage: 'Dispatch', label: 'Customer notified of dispatch date', sortOrder: 1 },
  { stage: 'Dispatch', label: 'Invoice issued', sortOrder: 2 },
  { stage: 'Dispatch', label: 'Job sheet / compliance docs ready', sortOrder: 3 },
  { stage: 'Dispatch', label: 'Transport booked / truck ready', sortOrder: 4 },
  { stage: 'Dispatch', label: 'Final photos taken', sortOrder: 5 },
]

export async function POST(_req: NextRequest) {
  const existing = await prisma.checklistTemplate.count()
  if (existing > 0) {
    return NextResponse.json({ message: 'Already seeded', count: existing })
  }

  const created = await prisma.checklistTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      description: '',
      required: true,
      active: true,
    })),
  })

  return NextResponse.json({ seeded: created.count })
}
