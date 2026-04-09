import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listJobDriveFiles } from '@/lib/drive'

export const dynamic = 'force-dynamic'

/**
 * GET /api/jobs/[id]/drive-vin-files
 * Search the job's Google Drive folder for VIN plate photos.
 * Looks for files with "vin" in the name, or common image files in the root.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await prisma.job.findUnique({ where: { id: params.id } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const allFiles = await listJobDriveFiles(job.num)

    // Filter for image files that look like VIN plates
    const vinFiles = allFiles.filter((f) => {
      const name = f.name.toLowerCase()
      const isImage = f.mimeType.startsWith('image/') ||
        name.endsWith('.jpg') || name.endsWith('.jpeg') ||
        name.endsWith('.png') || name.endsWith('.heic') ||
        name.endsWith('.webp')
      if (!isImage) return false

      // Match files with VIN-related names, or any image in root (likely chassis photos)
      return name.includes('vin') ||
        name.includes('plate') ||
        name.includes('compliance') ||
        name.includes('chassis') ||
        name.includes('nameplate') ||
        name.includes('id plate') ||
        name.includes('idplate')
    })

    // If no VIN-specific files found, return all images (user can pick)
    const result = vinFiles.length > 0
      ? vinFiles
      : allFiles.filter((f) => {
          const name = f.name.toLowerCase()
          return f.mimeType.startsWith('image/') ||
            name.endsWith('.jpg') || name.endsWith('.jpeg') ||
            name.endsWith('.png')
        }).slice(0, 10) // Limit to 10 images

    return NextResponse.json(
      result.map((f) => ({
        id: f.id,
        name: f.name,
        thumbnailLink: f.thumbnailLink || null,
      }))
    )
  } catch (error: any) {
    console.error('Drive VIN search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
