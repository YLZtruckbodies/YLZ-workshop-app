import { NextRequest, NextResponse } from 'next/server'
import { dispatchEngineeringPack } from '@/lib/dispatch'

export const dynamic = 'force-dynamic'

/**
 * POST /api/jobs/[id]/dispatch
 * Dispatches the full engineering pack: approves work order, notifies team,
 * advances job to Ready to Start.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}))
    const approvedBy = body.approvedBy || 'Engineering'
    const results = await dispatchEngineeringPack(params.id, approvedBy)
    return NextResponse.json({ results })
  } catch (error: any) {
    console.error('Dispatch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch engineering pack' },
      { status: 500 }
    )
  }
}
