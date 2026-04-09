import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const drawings = await prisma.jobDrawing.findMany({
      where: { jobId: params.id },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(drawings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
