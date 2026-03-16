import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compDate } from '@/lib/workdays'
import { SHEET_WORKER_BLOCKS } from '@/lib/sheets-config'

/**
 * POST /api/sheets/pull
 * Called by Google Apps Script to get worker data from DB → write to sheet.
 * Body: { secret }
 * Returns: { workers: [{ workerId, sheetHeader, block config, jobs: [...] }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const secret = body.secret

    const expectedSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    // Get unique worker IDs from config
    const workerIdSet = new Set(SHEET_WORKER_BLOCKS.map((b) => b.workerId))
    const workerIds = Array.from(workerIdSet)

    // Fetch all mapped workers with their jobs
    const workers = await prisma.worker.findMany({
      where: { id: { in: workerIds } },
      include: { jobs: { orderBy: { position: 'asc' } } },
    })

    // Build response with block mapping
    const result = SHEET_WORKER_BLOCKS.map((block) => {
      const worker = workers.find((w) => w.id === block.workerId)
      if (!worker) {
        return {
          workerId: block.workerId,
          sheetHeader: block.sheetHeader,
          block: {
            dataStartRow: block.dataStartRow,
            dataEndRow: block.dataEndRow,
            colJobNo: block.colJobNo,
            colType: block.colType,
            colStart: block.colStart,
            colComp: block.colComp,
            colDays: block.colDays,
          },
          jobs: [],
        }
      }

      // For workers with multiple blocks, distribute jobs
      const allBlocks = SHEET_WORKER_BLOCKS.filter((b) => b.workerId === block.workerId)
      const blockIdx = allBlocks.indexOf(block)
      const prevCapacity = allBlocks
        .slice(0, blockIdx)
        .reduce((sum, b) => sum + (b.dataEndRow - b.dataStartRow + 1), 0)
      const blockCapacity = block.dataEndRow - block.dataStartRow + 1
      const blockJobs = worker.jobs.slice(prevCapacity, prevCapacity + blockCapacity)

      return {
        workerId: block.workerId,
        sheetHeader: block.sheetHeader,
        block: {
          dataStartRow: block.dataStartRow,
          dataEndRow: block.dataEndRow,
          colJobNo: block.colJobNo,
          colType: block.colType,
          colStart: block.colStart,
          colComp: block.colComp,
          colDays: block.colDays,
        },
        jobs: blockJobs.map((j) => ({
          jobNo: j.jobNo,
          type: j.type,
          start: j.start,
          comp: compDate(j.start, j.days),
          days: j.days,
        })),
      }
    })

    // Log sync
    try {
      await prisma.syncLog.create({
        data: {
          workerId: 'all',
          direction: 'app-to-sheet',
          status: 'success',
          detail: 'pull: Apps Script requested data',
          jobCount: workers.reduce((s, w) => s + w.jobs.length, 0),
        },
      })
    } catch { /* ignore */ }

    return NextResponse.json({ workers: result })
  } catch (err: any) {
    console.error('Sheet pull error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
