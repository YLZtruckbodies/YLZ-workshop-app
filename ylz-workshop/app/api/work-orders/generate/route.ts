import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWorkOrder, findKitFiles } from '@/lib/kickoff-agent'
import {
  findChildFolder,
  BODY_KITS_FOLDER_ID,
} from '@/lib/drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // seconds — allow time for Drive API calls

// Trailer body folder IDs (mirrored from kickoff-agent — those are module-private)
const TRAILER_BODY_FOLDER_IDS: Record<string, string> = {
  '3-ally':  '1tvB-NsnN_tayknVYCAuhvx4WbnPR4Q58',
  '4-ally':  '1FwuSp3MxxiwwGuNNTctULo4VkOc6SlVK',
  '6-ally':  '1mF6KuWPdZyWuQeqXyWj3kPahWk5kYMmj',
  '3-steel': '1WiXTjJvvr7gDJmVSSZXsYVdzNcnnyn0y',
}

/**
 * POST /api/work-orders/generate
 * Manually trigger work order generation for an existing job.
 * Body: { jobId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    // Delete existing work order (allows regeneration)
    const existing = await prisma.workOrder.findUnique({ where: { jobId } })
    if (existing) {
      await prisma.workOrderPart.deleteMany({ where: { workOrderId: existing.id } })
      await prisma.workOrder.delete({ where: { id: existing.id } })
    }

    // Get job
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    // Find linked quote
    const quote = await prisma.quote.findFirst({ where: { jobId } })
    if (!quote) return NextResponse.json({ error: 'No quote linked to this job' }, { status: 404 })

    const cfg = (quote.configuration ?? {}) as Record<string, string>
    const buildType = (quote.buildType || job.type || '').toLowerCase()
    const isTrailer = buildType.includes('trailer') || buildType.includes('dog') || buildType.includes('semi') || buildType.includes('lead')

    if (isTrailer) {
      // Trailer path — find body folder by axle count + material
      const material = (cfg.material || cfg.trailerMaterial || '').toLowerCase()
      const isAlly = material.includes('alumin') || material.includes('alloy') || material.includes('ally')
      const axles = parseInt(cfg.axleCount || cfg.trailerAxleCount || '0', 10)
      const bodyLength = parseInt((cfg.bodyLength || cfg.trailerBodyLength || '0').replace(/[^\d]/g, ''), 10)

      const bodyFolderKey = `${axles}-${isAlly ? 'ally' : 'steel'}`
      const bodyFolderId = TRAILER_BODY_FOLDER_IDS[bodyFolderKey] ?? null

      if (!bodyFolderId) {
        return NextResponse.json({ error: `No standard body folder for ${axles}-axle ${material} trailer` }, { status: 404 })
      }

      let lookupId = bodyFolderId
      if (axles === 4 && bodyLength > 0) {
        const lenFolder = await findChildFolder(bodyFolderId, `${bodyLength} Body`)
        if (lenFolder) lookupId = lenFolder
      }

      const drawingsId = await findChildFolder(lookupId, 'Drawings')
      if (!drawingsId) return NextResponse.json({ error: 'No Drawings folder found in Drive' }, { status: 404 })

      const [dxfId, pdfId] = await Promise.all([
        findChildFolder(drawingsId, 'DXF'),
        findChildFolder(drawingsId, 'PDF'),
      ])

      if (!dxfId) return NextResponse.json({ error: 'No DXF folder found in Drive' }, { status: 404 })

      const kitLabel = `${axles}-Axle ${isAlly ? 'Aluminium' : 'Steel'} Trailer Body`
      await generateWorkOrder(jobId, job.num, job.customer, kitLabel, dxfId, pdfId, drawingsId)

    } else {
      // Truck body path
      const material = (cfg.material || cfg.truckMaterial || '').toLowerCase()
      const bodyLength = parseInt((cfg.bodyLength || cfg.truckBodyLength || '0').replace(/[^\d]/g, ''), 10)
      const bodyHeight = parseInt((cfg.bodyHeight || cfg.truckBodyHeight || '0').replace(/[^\d]/g, ''), 10)
      const isHardox = material.includes('hardox')

      if (bodyLength === 0 || bodyHeight === 0) {
        return NextResponse.json({ error: 'Missing body dimensions in quote config' }, { status: 400 })
      }

      const kitFiles = await findKitFiles(bodyLength, bodyHeight, isHardox)
      if (!kitFiles) {
        const matCode = isHardox ? 'H' : 'A'
        return NextResponse.json({ error: `No standard kit found for YLZ${bodyLength}x${bodyHeight}-${matCode}-WM` }, { status: 404 })
      }

      await generateWorkOrder(jobId, job.num, job.customer, kitFiles.kitName, kitFiles.dxfFolderId, kitFiles.pdfFolderId, kitFiles.drawingsFolderId)
    }

    // Return the created work order
    const wo = await prisma.workOrder.findUnique({
      where: { jobId },
      include: { parts: true },
    })

    return NextResponse.json(wo)
  } catch (error: any) {
    console.error('Work order generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate work order' }, { status: 500 })
  }
}
