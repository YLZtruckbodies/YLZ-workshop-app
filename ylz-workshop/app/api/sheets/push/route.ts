import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/sheets/push
 * Called by Google Apps Script to push sheet data → database.
 * Body: { secret, workers: [{ workerId, jobs: [{ jobNo, type, start, days }] }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const secret = body.secret

    // Validate webhook secret
    const expectedSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const workersData = body.workers
    if (!Array.isArray(workersData)) {
      return NextResponse.json({ error: 'workers array required' }, { status: 400 })
    }

    let totalCreated = 0
    let totalUpdated = 0
    let totalDeleted = 0

    for (const wd of workersData) {
      const { workerId, jobs } = wd
      if (!workerId || !Array.isArray(jobs)) continue

      // Check worker exists
      const worker = await prisma.worker.findUnique({ where: { id: workerId } })
      if (!worker) continue

      // Get current DB jobs
      const dbJobs = await prisma.workerJob.findMany({
        where: { workerId },
        orderBy: { position: 'asc' },
      })

      await prisma.$transaction(async (tx: any) => {
        const sheetJobNos = new Set(
          jobs.filter((j: any) => j.jobNo?.trim()).map((j: any) => j.jobNo.trim())
        )

        // Delete jobs no longer in sheet
        const toDelete = dbJobs.filter((j: any) => j.jobNo && !sheetJobNos.has(j.jobNo))
        for (const j of toDelete) {
          await tx.workerJob.delete({ where: { id: j.id } })
          totalDeleted++
        }

        // Upsert jobs from sheet
        for (let i = 0; i < jobs.length; i++) {
          const sj: any = jobs[i]
          if (!sj.jobNo?.trim()) continue

          const existing = dbJobs.find((j: any) => j.jobNo === sj.jobNo.trim())
          if (existing) {
            await tx.workerJob.update({
              where: { id: existing.id },
              data: {
                type: sj.type || '',
                start: sj.start || '',
                days: parseInt(sj.days) || 1,
                position: i,
              },
            })
            totalUpdated++
          } else {
            await tx.workerJob.create({
              data: {
                workerId,
                jobNo: sj.jobNo.trim(),
                type: sj.type || '',
                start: sj.start || '',
                days: parseInt(sj.days) || 1,
                position: i,
              },
            })
            totalCreated++
          }
        }

        await tx.worker.update({
          where: { id: workerId },
          data: { lastSyncAt: new Date(), lastSyncSource: 'sheet' },
        })
      })
    }

    // Log sync
    try {
      await prisma.syncLog.create({
        data: {
          workerId: 'all',
          direction: 'sheet-to-app',
          status: 'success',
          detail: `push: ${totalCreated} created, ${totalUpdated} updated, ${totalDeleted} deleted`,
          jobCount: totalCreated + totalUpdated,
        },
      })
    } catch { /* ignore logging errors */ }

    return NextResponse.json({
      success: true,
      summary: { created: totalCreated, updated: totalUpdated, deleted: totalDeleted },
    })
  } catch (err: any) {
    console.error('Sheet push error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
