import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecentSyncLogs } from '@/lib/sheets'

/**
 * POST /api/sheets/sync
 * Triggers sync. Now works via Apps Script push/pull (no Google API credentials needed).
 * The "Sync Sheet" button in the app calls this, which returns instructions
 * or uses the push/pull endpoints that Apps Script calls.
 *
 * For App → Sheet: The app exposes /api/sheets/pull for Apps Script to fetch
 * For Sheet → App: Apps Script pushes to /api/sheets/push
 *
 * When called from the UI, this triggers an "app-initiated" sync by
 * returning the pull data directly so the frontend can pass it to Apps Script,
 * OR by reading from the push cache if Apps Script recently pushed.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.fullAdmin && !user?.canEdit) {
      return NextResponse.json({ error: 'Admin or edit access required' }, { status: 403 })
    }

    // Check if Google Sheets API credentials are configured
    const hasCredentials = !!(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY)

    if (hasCredentials) {
      // Use direct Google Sheets API sync
      const { fullSync, syncWorkerToSheet, syncSheetToWorker } = await import('@/lib/sheets')
      const body = await req.json().catch(() => ({}))
      const workerId = body?.workerId

      if (workerId) {
        const summary = await syncSheetToWorker(workerId)
        await syncWorkerToSheet(workerId)
        return NextResponse.json({ success: true, summary: { ...summary, workerId } })
      }

      const { total, perWorker } = await fullSync()
      return NextResponse.json({
        success: true,
        summary: { created: total.created, updated: total.updated, deleted: total.deleted, errors: total.errors.length },
        perWorker,
        errors: total.errors.slice(0, 10),
      })
    }

    // No credentials — return guidance to use Apps Script sync
    // Check if there was a recent push from Apps Script
    const { prisma } = await import('@/lib/prisma')
    const recentLog = await prisma.syncLog.findFirst({
      where: { direction: 'sheet-to-app' },
      orderBy: { createdAt: 'desc' },
    })

    const lastSyncAgo = recentLog
      ? Math.round((Date.now() - recentLog.createdAt.getTime()) / 1000)
      : null

    if (lastSyncAgo !== null && lastSyncAgo < 30) {
      // Recent push from Apps Script — data is fresh
      return NextResponse.json({
        success: true,
        summary: { created: 0, updated: 0, deleted: 0 },
        message: `Data was synced from sheet ${lastSyncAgo}s ago`,
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Apps Script sync required',
      message: 'Open the Google Sheet and run Sync → Push to App from the YLZ menu, or set up auto-sync.',
      hint: 'appsscript',
    })
  } catch (err: any) {
    console.error('Sheets sync error:', err)
    return NextResponse.json({ error: 'Sync failed', detail: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const logs = await getRecentSyncLogs(30)
    return NextResponse.json(logs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
