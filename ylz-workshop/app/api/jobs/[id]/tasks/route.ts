import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tasks = await prisma.jobTask.findMany({
    where: { jobId: params.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const count = await prisma.jobTask.count({ where: { jobId: params.id } })
  const task = await prisma.jobTask.create({
    data: {
      jobId: params.id,
      title: body.title,
      assignedTo: body.assignedTo || '',
      dueDate: body.dueDate || '',
      sortOrder: count,
    },
  })
  return NextResponse.json(task, { status: 201 })
}
