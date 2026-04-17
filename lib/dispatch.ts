import { prisma } from './prisma'

export interface DispatchResult {
  target: string
  method: string
  status: 'sent' | 'failed' | 'skipped'
  detail: string
}

/**
 * Dispatches the full engineering pack for a job:
 * 1. Approve cold form work order (if draft)
 * 2. Notify Liz to enter BOM into MRPeasy
 * 3. Notify workshop that job is ready
 * 4. Advance job to "Ready to Start"
 * 5. Log all dispatches
 *
 * Email dispatches (Cold Form, Panchal, SAF/TMC, CVC) are placeholders
 * until email addresses are confirmed by Nathan/Chris.
 */
export async function dispatchEngineeringPack(
  jobId: string,
  approvedBy: string = 'Engineering',
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = []

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Job not found')

  // 1. Approve cold form work order if still draft
  const workOrder = await prisma.workOrder.findUnique({ where: { jobId } })
  if (workOrder && workOrder.status === 'draft') {
    await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: { status: 'approved', approvedBy, approvedAt: new Date() },
    })
    results.push({ target: 'coldform', method: 'notification', status: 'sent', detail: `Work order approved` })
  } else if (workOrder) {
    results.push({ target: 'coldform', method: 'notification', status: 'skipped', detail: `Already ${workOrder.status}` })
  } else {
    results.push({ target: 'coldform', method: 'notification', status: 'skipped', detail: 'No work order exists' })
  }

  // 1b. Create Cold Form kit/chassis entry if work order was just approved
  const quote = await prisma.quote.findFirst({ where: { jobId } })
  const cfg = (quote?.configuration ?? {}) as Record<string, any>
  // Flatten nested truck-and-trailer config
  const tc = cfg.truckConfig || {}
  const trc = cfg.trailerConfig || {}
  const flatCfg = { ...cfg, ...tc }
  const buildType = (quote?.buildType || job.type || '').toLowerCase()
  const isTrailer = !!buildType.match(/trailer|dog|semi|lead/)

  if (workOrder && workOrder.status === 'draft') {
    try {
      // Check if a coldform kit already exists for this job
      const existingKit = await prisma.coldformKit.findFirst({
        where: { allocatedTo: job.num },
      })

      if (!existingKit) {
        const kitSize = workOrder.kitName || `${flatCfg.bodyLength || ''}x${flatCfg.bodyHeight || ''}`
        await prisma.coldformKit.create({
          data: {
            size: kitSize,
            allocatedTo: job.num,
            notes: `Auto-created from engineering pack approval`,
            walls: 'N', tunnel: 'N', floor: 'N', headBoard: 'N',
            tailGate: 'N', splashGuards: 'N', lightStrips: 'N',
          },
        })
        results.push({ target: 'coldform-kit', method: 'notification', status: 'sent', detail: `Kit "${kitSize}" added to Cold Form tab` })
      } else {
        results.push({ target: 'coldform-kit', method: 'notification', status: 'skipped', detail: 'Kit already exists' })
      }

      // Create trailer chassis entry if applicable
      if (isTrailer) {
        const existingChassis = await prisma.coldformChassis.findFirst({
          where: { jobNo: job.num },
        })
        if (!existingChassis) {
          const chassisLength = trc.chassisLength || flatCfg.chassisLength || ''
          await prisma.coldformChassis.create({
            data: {
              jobNo: job.num,
              chassisLength: String(chassisLength),
              notes: `Auto-created — ${trc.axleCount || flatCfg.axleCount || ''}x ${trc.axleMake || flatCfg.axleMake || ''} ${trc.axleType || flatCfg.axleType || ''}`.trim(),
            },
          })
          results.push({ target: 'coldform-chassis', method: 'notification', status: 'sent', detail: `Chassis entry added to Cold Form tab` })
        }
      }
    } catch (e) {
      console.error('Cold Form entry creation failed:', e)
    }
  }

  // 2. Email Cold Form (placeholder — needs warehouse@coldform.com.au confirmed)
  // TODO: Send work order PDF + DXF attachments to Cold Form
  results.push({ target: 'coldform-email', method: 'email', status: 'skipped', detail: 'Email target not yet configured' })

  // 3. Email Panchal / tube laser (placeholder)
  results.push({ target: 'panchal', method: 'email', status: 'skipped', detail: 'Email target not yet configured' })

  // 4. Email axle supplier (placeholder — trailers only)
  if (isTrailer && (trc.axleMake || flatCfg.axleMake)) {
    results.push({ target: 'axle-supplier', method: 'email', status: 'skipped', detail: 'Email target not yet configured' })
  }

  // 5. Email CVC / VASS (placeholder)
  const vassBooking = await prisma.vassBooking.findFirst({ where: { jobNumber: job.num } })
  if (vassBooking) {
    results.push({ target: 'cvc', method: 'email', status: 'skipped', detail: 'Email target not yet configured' })
  }

  // 6. Notify Liz to enter BOM into MRPeasy
  const liz = await prisma.user.findFirst({
    where: { name: { contains: 'Liz', mode: 'insensitive' } },
    select: { id: true },
  })
  if (liz) {
    await prisma.notification.create({
      data: {
        userId: liz.id,
        jobId,
        jobNum: job.num,
        type: 'parts-order',
        message: `${job.num} engineering pack approved by ${approvedBy}. MRP checklist ready — enter BOM into MRPeasy.`,
      },
    })
    await prisma.jobTask.create({
      data: {
        jobId,
        title: `Enter ${job.num} into MRPeasy`,
        assignedTo: liz.id,
        sortOrder: 1,
      },
    })
    results.push({ target: 'liz', method: 'notification', status: 'sent', detail: 'Notified + task created' })
  } else {
    results.push({ target: 'liz', method: 'notification', status: 'skipped', detail: 'Liz user not found' })
  }

  // 6b. Auto-generate MRP checklist
  try {
    const existingChecklist = await prisma.mrpChecklist.findUnique({ where: { jobId } })
    if (!existingChecklist) {
      const drawings = await prisma.jobDrawing.findMany({ where: { jobId } })
      const stepFiles = drawings.filter((d: any) => d.type === 'step')
      const tubePdfs = drawings.filter((d: any) => d.category === 'tube-laser')

      // Resolve BOM list
      let bomList: any[] = []
      try {
        const savedJob = await prisma.job.findUnique({ where: { id: jobId }, select: { bomList: true } })
        bomList = Array.isArray(savedJob?.bomList) ? savedJob.bomList as any[] : []
      } catch { /* ignore */ }
      const bomSummary = bomList.map((b: any) => {
        const base = `${b.code || b.partNumber || '?'} — ${b.name || b.description || ''}`
        return b.note ? `${base} (${b.note})` : base
      }).join('\n')

      const tarpSystem = flatCfg.tarpSystem || trc.tarpSystem || ''
      const items: any[] = [
        {
          section: 'mrp-entry', label: 'Enter BOM into MRPeasy', sortOrder: 0,
          details: { bomCount: bomList.length, bomList: bomSummary || 'No BOM resolved yet' },
        },
        {
          section: 'tarp', sortOrder: 1,
          label: tarpSystem && tarpSystem !== 'None' ? tarpSystem : 'No tarp specified',
          details: {
            system: tarpSystem || 'None',
            colour: flatCfg.tarpColour || trc.tarpColour || '',
            length: flatCfg.tarpLength || trc.tarpLength || '',
            bowSize: flatCfg.tarpBowSize || trc.tarpBowSize || '',
            bodyLength: flatCfg.bodyLength || trc.bodyLength || '',
            bodyHeight: flatCfg.bodyHeight || trc.bodyHeight || '',
          },
        },
        {
          section: 'pto', sortOrder: 2,
          label: flatCfg.pto || 'PTO — check with engineering',
          details: { pto: flatCfg.pto || '', chassisMake: flatCfg.chassisMake || '', chassisModel: flatCfg.chassisModel || '' },
        },
        {
          section: 'hoist', sortOrder: 3,
          label: flatCfg.hoist || trc.hoist || 'Hoist — check with engineering',
          details: {
            hoist: flatCfg.hoist || trc.hoist || '',
            pivotCentre: flatCfg.pivotCentre || '',
            hydTankType: flatCfg.hydTankType || '',
            hydraulics: flatCfg.hydraulics || '',
            controls: flatCfg.controls || '',
          },
        },
      ]

      // Axles (if trailer or has axle data)
      const axleMake = flatCfg.axleMake || trc.axleMake || ''
      if (axleMake || isTrailer) {
        items.push({
          section: 'axles', sortOrder: 4,
          label: axleMake ? `${trc.axleCount || flatCfg.axleCount || ''}x ${axleMake} ${trc.axleType || flatCfg.axleType || ''}` : 'Axles — check with engineering',
          details: {
            make: axleMake, count: String(trc.axleCount || flatCfg.axleCount || ''),
            type: trc.axleType || flatCfg.axleType || '',
            suspension: trc.suspension || flatCfg.suspension || '',
            studPattern: trc.studPattern || flatCfg.studPattern || '',
            axleLift: trc.axleLift || flatCfg.axleLift || '',
          },
        })
      }

      // Tube laser
      items.push({
        section: 'tube-laser', sortOrder: 5,
        label: stepFiles.length > 0 ? `${stepFiles.length} STEP + ${tubePdfs.length} PDF files` : 'No STEP files found yet',
        details: {
          stepFiles: stepFiles.map((f: any) => ({ name: f.fileName, fileId: f.driveFileId })),
          pdfFiles: tubePdfs.map((f: any) => ({ name: f.fileName, fileId: f.driveFileId })),
        },
      })

      // Other
      items.push({ section: 'other', sortOrder: 6, label: 'Other parts / special orders', details: {} })

      await prisma.mrpChecklist.create({
        data: {
          jobId,
          jobNum: job.num,
          customer: job.customer || '',
          items: { create: items },
        },
      })
      results.push({ target: 'mrp-checklist', method: 'notification', status: 'sent', detail: `Checklist created with ${items.length} sections` })
    } else {
      results.push({ target: 'mrp-checklist', method: 'notification', status: 'skipped', detail: 'Checklist already exists' })
    }
  } catch (e) {
    console.error('MRP checklist creation failed:', e)
    results.push({ target: 'mrp-checklist', method: 'notification', status: 'failed', detail: 'Auto-creation failed' })
  }

  // 7. Notify workshop
  const admins = await prisma.user.findMany({ where: { fullAdmin: true }, select: { id: true } })
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a: any) => ({
        userId: a.id,
        jobId,
        jobNum: job.num,
        type: 'automation',
        message: `${job.num} (${job.customer}) engineering pack approved — ready for workshop.`,
      })),
    })
    results.push({ target: 'workshop', method: 'notification', status: 'sent', detail: `${admins.length} admin(s) notified` })
  }

  // 8. Advance job stage
  const { nextStage } = await import('./jobTypes')
  if (job.stage === 'Requires Engineering') {
    const next = nextStage(job.stage)
    if (next) {
      await prisma.job.update({ where: { id: jobId }, data: { stage: next } })
      await prisma.jobActivity.create({
        data: {
          jobId,
          userId: '',
          userName: approvedBy,
          field: 'stage',
          fromValue: job.stage,
          toValue: next,
        },
      })
      await prisma.jobNote.create({
        data: {
          jobId,
          authorId: 'system',
          authorName: 'System',
          type: 'automation',
          message: `Engineering pack dispatched by ${approvedBy}. Job advanced to ${next}.`,
        },
      })
      results.push({ target: 'job-advance', method: 'notification', status: 'sent', detail: `Advanced to ${next}` })
    }
  } else {
    results.push({ target: 'job-advance', method: 'notification', status: 'skipped', detail: `Job is at ${job.stage}, not Requires Engineering` })
  }

  // Log all dispatches
  await prisma.dispatchLog.createMany({
    data: results.map(r => ({
      jobId,
      target: r.target,
      method: r.method,
      status: r.status,
      detail: r.detail,
    })),
  })

  return results
}
