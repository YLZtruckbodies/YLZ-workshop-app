import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { approvedBy } = await req.json()

  const order = await prisma.workOrder.update({
    where: { id: params.id },
    data: {
      status: 'approved',
      approvedBy: approvedBy || 'Engineering',
      approvedAt: new Date(),
    },
  })

  // Notify relevant users (Cold Form team / Nathan)
  try {
    const users = await prisma.user.findMany({
      where: { name: { in: ['Nathan', 'Liz'], mode: 'insensitive' } },
      select: { id: true },
    })
    if (users.length) {
      await prisma.notification.createMany({
        data: users.map((u: { id: string }) => ({
          userId: u.id,
          jobId: order.jobId,
          jobNum: order.jobNum,
          type: 'work-order-approved',
          message: `Work order approved for ${order.jobNum} — ${order.kitName}. Ready for Cold Form.`,
        })),
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json(order)
}
