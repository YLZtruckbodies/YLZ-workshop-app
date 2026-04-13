import { NextRequest, NextResponse } from 'next/server'
import { downloadDriveFile } from '@/lib/drive'

/**
 * GET /api/drive-files/[fileId]
 * Proxies a file download from Google Drive.
 * This allows the workshop app to serve Drive files
 * without requiring users to have direct Drive access.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Check if this is a folder — redirect to Google Drive instead of downloading
    const { getDriveClient } = await import('@/lib/drive')
    const drive = await getDriveClient()
    const meta = await drive.files.get({ fileId: params.fileId, fields: 'mimeType' })
    if (meta.data.mimeType === 'application/vnd.google-apps.folder') {
      return NextResponse.redirect(`https://drive.google.com/drive/folders/${params.fileId}`)
    }

    const { buffer, mimeType, fileName } = await downloadDriveFile(params.fileId)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error: any) {
    console.error('Drive file download error:', error)
    return NextResponse.json(
      { error: 'Failed to download Drive file' },
      { status: 500 }
    )
  }
}
