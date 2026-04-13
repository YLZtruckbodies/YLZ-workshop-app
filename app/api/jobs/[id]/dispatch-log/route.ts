import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logs = await prisma.dispatchLog.findMany({
      where: { jobId: params.id },
      orderBy: { sentAt: 'desc' },
    })
    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
