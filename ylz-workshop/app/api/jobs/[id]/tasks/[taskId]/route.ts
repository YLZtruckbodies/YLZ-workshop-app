import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const body = await req.json()
  const data: any = {}
  if ('title' in body) data.title = body.title
  if ('assignedTo' in body) data.assignedTo = body.assignedTo
  if ('dueDate' in body) data.dueDate = body.dueDate
  if ('sortOrder' in body) data.sortOrder = body.sortOrder
  if ('completed' in body) {
    data.completed = body.completed
    if (body.completed) {
      data.completedAt = new Date()
      data.completedBy = body.completedBy || ''
    } else {
      data.completedAt = null
      data.completedBy = ''
    }
  }
  const task = await prisma.jobTask.update({ where: { id: params.taskId }, data })
  return NextResponse.json(task)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  await prisma.jobTask.delete({ where: { id: params.taskId } })
  return NextResponse.json({ success: true })
}
