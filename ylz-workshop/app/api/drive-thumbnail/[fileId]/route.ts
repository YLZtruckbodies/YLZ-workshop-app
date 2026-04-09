import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'

export const dynamic = 'force-dynamic'

/**
 * GET /api/drive-thumbnail/[fileId]
 * Proxies a Google Drive file thumbnail so it doesn't expire.
 * Returns the thumbnail image directly with proper cache headers.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const drive = await getDriveClient()

    // Get fresh thumbnail link from Drive API
    const file = await drive.files.get({
      fileId: params.fileId,
      fields: 'thumbnailLink',
    })

    const thumbUrl = file.data.thumbnailLink
    if (!thumbUrl) {
      return new NextResponse(null, { status: 404 })
    }

    // Request higher resolution thumbnail
    const hiResUrl = thumbUrl.replace(/=s\d+$/, '=s800')

    // Fetch the actual thumbnail image
    const imgRes = await fetch(hiResUrl)
    if (!imgRes.ok) {
      return new NextResponse(null, { status: 502 })
    }

    const buffer = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') || 'image/png'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // cache 24h
      },
    })
  } catch (error: any) {
    console.error('Drive thumbnail error:', error?.message)
    return new NextResponse(null, { status: 500 })
  }
}
