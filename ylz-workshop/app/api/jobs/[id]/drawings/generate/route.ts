import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findKitFiles, generateJobDrawings } from '@/lib/kickoff-agent'
import { findChildFolder } from '@/lib/drive'

export const dynamic = 'force-dynamic'

// Trailer body folder IDs (mirrored from kickoff-agent)
const TRAILER_BODY_FOLDER_IDS: Record<string, string> = {
  '3-ally':  '1tvB-NsnN_tayknVYCAuhvx4WbnPR4Q58',
  '4-ally':  '1FwuSp3MxxiwwGuNNTctULo4VkOc6SlVK',
  '6-ally':  '1mF6KuWPdZyWuQeqXyWj3kPahWk5kYMmj',
  '3-steel': '1WiXTjJvvr7gDJmVSSZXsYVdzNcnnyn0y',
}

/**
 * POST /api/jobs/[id]/drawings/generate
 * Manually trigger drawing generation for an existing job.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const quote = await prisma.quote.findFirst({ where: { jobId } })
    if (!quote) return NextResponse.json({ error: 'No quote linked to this job' }, { status: 404 })

    const cfg = (quote.configuration ?? {}) as Record<string, string>
    const buildType = (quote.buildType || job.type || '').toLowerCase()
    const isTrailer = buildType.includes('trailer') || buildType.includes('dog') || buildType.includes('semi') || buildType.includes('lead')

    if (isTrailer) {
      const material = (cfg.material || cfg.trailerMaterial || '').toLowerCase()
      const isAlly = material.includes('alumin') || material.includes('alloy') || material.includes('ally')
      const axles = parseInt(cfg.axleCount || cfg.trailerAxleCount || '0', 10)
      const bodyLength = parseInt((cfg.bodyLength || cfg.trailerBodyLength || '0').replace(/[^\d]/g, ''), 10)

      const bodyFolderKey = `${axles}-${isAlly ? 'ally' : 'steel'}`
      const bodyFolderId = TRAILER_BODY_FOLDER_IDS[bodyFolderKey] ?? null
      if (!bodyFolderId) return NextResponse.json({ error: 'No standard body folder found' }, { status: 404 })

      let lookupId = bodyFolderId
      if (axles === 4 && bodyLength > 0) {
        const lenFolder = await findChildFolder(bodyFolderId, `${bodyLength} Body`)
        if (lenFolder) lookupId = lenFolder
      }

      const drawingsId = await findChildFolder(lookupId, 'Drawings')
      const pdfId = drawingsId ? await findChildFolder(drawingsId, 'PDF') : null

      await generateJobDrawings(jobId, lookupId, drawingsId, pdfId, job.num)
    } else {
      const material = (cfg.material || cfg.truckMaterial || '').toLowerCase()
      const bodyLength = parseInt((cfg.bodyLength || cfg.truckBodyLength || '0').replace(/[^\d]/g, ''), 10)
      const bodyHeight = parseInt((cfg.bodyHeight || cfg.truckBodyHeight || '0').replace(/[^\d]/g, ''), 10)
      const isHardox = material.includes('hardox')

      if (bodyLength === 0 || bodyHeight === 0) {
        return NextResponse.json({ error: 'Missing body dimensions in quote config' }, { status: 400 })
      }

      const kitFiles = await findKitFiles(bodyLength, bodyHeight, isHardox)
      if (!kitFiles) return NextResponse.json({ error: 'No standard kit found' }, { status: 404 })

      await generateJobDrawings(jobId, kitFiles.cadFolderId, kitFiles.drawingsFolderId, kitFiles.pdfFolderId, job.num)
    }

    const drawings = await prisma.jobDrawing.findMany({
      where: { jobId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(drawings)
  } catch (error: any) {
    console.error('Drawing generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate drawings' }, { status: 500 })
  }
}
