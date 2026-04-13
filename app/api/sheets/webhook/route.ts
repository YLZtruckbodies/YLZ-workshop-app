import { NextRequest, NextResponse } from 'next/server'
import { isRecentAppWrite, syncSheetToWorker, identifyAffectedWorkers } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verify webhook secret
    const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET
    if (!secret || body.secret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { row, col } = body
    if (!row || !col) {
      return NextResponse.json({ error: 'Missing row/col' }, { status: 400 })
    }

    // Determine which worker was edited
    const affectedWorkerIds = identifyAffectedWorkers(row, col)
    if (affectedWorkerIds.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Edit not in a worker block' })
    }

    const results: Record<string, string> = {}

    for (const workerId of affectedWorkerIds) {
      // Check sync lock — skip if the app just wrote to this worker
      if (await isRecentAppWrite(workerId)) {
        results[workerId] = 'skipped (recent app write)'
        continue
      }

      try {
        const summary = await syncSheetToWorker(workerId)
        results[workerId] = `created=${summary.created} updated=${summary.updated} deleted=${summary.deleted}`
      } catch (err: any) {
        results[workerId] = `error: ${err.message}`
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error('Sheets webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed', detail: err.message },
      { status: 500 }
    )
  }
}
