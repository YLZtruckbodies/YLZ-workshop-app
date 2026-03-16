import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile, unlink } from 'fs/promises'
import path from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.jobFile.findUnique({
      where: { id: params.id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'job-files')
    const filePath = path.join(uploadDir, file.filePath)

    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.jobFile.findUnique({
      where: { id: params.id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete file from disk
    const uploadDir = path.join(process.cwd(), 'uploads', 'job-files')
    const filePath = path.join(uploadDir, file.filePath)

    try {
      await unlink(filePath)
    } catch {
      // File may already be deleted from disk, continue
    }

    // Delete metadata from DB
    await prisma.jobFile.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('File delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
