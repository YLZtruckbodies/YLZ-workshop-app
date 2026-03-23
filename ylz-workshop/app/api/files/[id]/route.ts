import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { downloadDriveFile, deleteFileFromDrive } from '@/lib/drive'

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

    if (file.filePath.startsWith('drive:')) {
      // Serve from Google Drive
      const driveFileId = file.filePath.replace('drive:', '')
      const { buffer, mimeType, fileName } = await downloadDriveFile(driveFileId)

      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      })
    }

    // Legacy: local file path (fallback — not reachable on Vercel)
    const { readFile } = await import('fs/promises')
    const path = await import('path')
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

    if (file.filePath.startsWith('drive:')) {
      // Delete from Google Drive
      const driveFileId = file.filePath.replace('drive:', '')
      try {
        await deleteFileFromDrive(driveFileId)
      } catch {
        // Already gone from Drive — continue to delete DB record
      }
    } else {
      // Legacy: delete from disk
      const { unlink } = await import('fs/promises')
      const path = await import('path')
      const uploadDir = path.join(process.cwd(), 'uploads', 'job-files')
      const filePath = path.join(uploadDir, file.filePath)
      try {
        await unlink(filePath)
      } catch {
        // File may already be deleted from disk
      }
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
