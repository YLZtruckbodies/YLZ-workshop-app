import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'

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

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storedName = `${timestamp}_${safeName}`
    const uploadDir = path.join(process.cwd(), 'uploads', 'job-files')
    const filePath = path.join(uploadDir, storedName)

    // Write file to disk
    await writeFile(filePath, buffer)

    // Save metadata to DB
    const jobFile = await prisma.jobFile.create({
      data: {
        jobId,
        fileName: file.name,
        fileType: file.type || '',
        filePath: storedName,
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
