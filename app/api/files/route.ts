import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadFileToDrive } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')

  const where: any = {}
  if (jobId) where.jobId = jobId

  const files = await prisma.jobFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(files)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const jobId = formData.get('jobId') as string | null
    const uploadedBy = formData.get('uploadedBy') as string || ''

    if (!file || !jobId) {
      return NextResponse.json(
        { error: 'file and jobId are required' },
        { status: 400 }
      )
    }

    // Look up the job to get its number (needed to find/create the Drive folder)
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Google Drive job folder (creates folder if it doesn't exist)
    const driveFileId = await uploadFileToDrive(
      job.num,
      file.name,
      file.type || 'application/octet-stream',
      buffer
    )

    // Save metadata to DB — Drive file ID stored with "drive:" prefix
    const jobFile = await prisma.jobFile.create({
      data: {
        jobId,
        fileName: file.name,
        fileType: file.type || '',
        filePath: `drive:${driveFileId}`,
        fileSize: buffer.length,
        uploadedBy,
      },
    })

    return NextResponse.json(jobFile, { status: 201 })
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
