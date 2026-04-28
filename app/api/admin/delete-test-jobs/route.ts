import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Hardcoded list of test jobs to delete. Endpoint is a no-op once these are gone.
const JOB_NUMS = ['YLZ1123', 'YLZ1124', 'YLZ1125', 'YLZ1126']

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as { fullAdmin?: boolean } | undefined
  if (!user?.fullAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const jobs = await prisma.job.findMany({ where: { num: { in: JOB_NUMS } } })
  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, deleted: [], message: 'No matching jobs (already deleted)' })
  }

  const jobIds = jobs.map(j => j.id)
  const jobNums = jobs.map(j => j.num)

  const counts: Record<string, number> = {}
  await prisma.$transaction(async (tx) => {
    const ql = await tx.quote.updateMany({ where: { jobId: { in: jobIds } }, data: { jobId: null } })
    counts['Quote.jobId cleared'] = ql.count

    const del = async (label: string, fn: () => Promise<{ count: number }>) => {
      const r = await fn()
      if (r.count > 0) counts[label] = r.count
    }
    await del('JobNote',          () => tx.jobNote.deleteMany         ({ where: { jobId: { in: jobIds } } }))
    await del('JobFile',          () => tx.jobFile.deleteMany         ({ where: { jobId: { in: jobIds } } }))
    await del('JobActivity',      () => tx.jobActivity.deleteMany     ({ where: { jobId: { in: jobIds } } }))
    await del('JobTask',          () => tx.jobTask.deleteMany         ({ where: { jobId: { in: jobIds } } }))
    await del('JobDependency',    () => tx.jobDependency.deleteMany   ({ where: { OR: [{ jobId: { in: jobIds } }, { blockedById: { in: jobIds } }] } }))
    await del('Delivery',         () => tx.delivery.deleteMany        ({ where: { jobId: { in: jobIds } } }))
    await del('DeliverySignoff',  () => tx.deliverySignoff.deleteMany ({ where: { jobId: { in: jobIds } } }))
    await del('PartsOrder',       () => tx.partsOrder.deleteMany      ({ where: { jobId: { in: jobIds } } }))
    await del('Notification',     () => tx.notification.deleteMany    ({ where: { OR: [{ jobId: { in: jobIds } }, { jobNum: { in: jobNums } }] } }))
    await del('OutboundMessage',  () => tx.outboundMessage.deleteMany ({ where: { jobId: { in: jobIds } } }))
    await del('JobDrawing',       () => tx.jobDrawing.deleteMany      ({ where: { jobId: { in: jobIds } } }))
    await del('DispatchLog',      () => tx.dispatchLog.deleteMany     ({ where: { jobId: { in: jobIds } } }))
    await del('MrpChecklist',     () => tx.mrpChecklist.deleteMany    ({ where: { jobId: { in: jobIds } } }))
    await del('WorkOrder',        () => tx.workOrder.deleteMany       ({ where: { jobId: { in: jobIds } } }))
    await del('WorkerJob',        () => tx.workerJob.deleteMany       ({ where: { jobNo: { in: jobNums } } }))
    await del('Tarp',             () => tx.tarp.deleteMany            ({ where: { jobNo: { in: jobNums } } }))
    await del('Timesheet',        () => tx.timesheet.deleteMany       ({ where: { jobNum: { in: jobNums } } }))
    await del('CompletedOrder',   () => tx.completedOrder.deleteMany  ({ where: { jobNo: { in: jobNums } } }))
    await del('ColdformChassis',  () => tx.coldformChassis.deleteMany ({ where: { jobNo: { in: jobNums } } }))
    await del('JobFollowerCheck', () => tx.jobFollowerCheck.deleteMany({ where: { jobNum: { in: jobNums } } }))
    await del('VassBooking',      () => tx.vassBooking.deleteMany     ({ where: { jobNumber: { in: jobNums } } }))
    await del('VinPlateRecord',   () => tx.vinPlateRecord.deleteMany  ({ where: { jobNumber: { in: jobNums } } }))
    await del('JobMaster',        () => tx.jobMaster.deleteMany       ({ where: { jobNumber: { in: jobNums } } }))
    await del('Job',              () => tx.job.deleteMany             ({ where: { id: { in: jobIds } } }))
  })

  return NextResponse.json({ ok: true, deleted: jobNums, counts })
}
