import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * GET /api/drive-thumbnail/[fileId]
 * Proxies a Google Drive file thumbnail with optional processing to make
 * thin DXF lines visible at small sizes.
 *
 * If sharp processing fails (native binary issue on serverless), falls back
 * to serving the raw Drive thumbnail.
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
      supportsAllDrives: true,
    })

    const thumbUrl = file.data.thumbnailLink
    if (!thumbUrl) {
      return new NextResponse(null, { status: 404 })
    }

    // Request higher resolution thumbnail
    const hiResUrl = thumbUrl.replace(/=s\d+$/, '=s400')

    const imgRes = await fetch(hiResUrl)
    if (!imgRes.ok) {
      return new NextResponse(null, { status: 502 })
    }

    const inputBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Try sharp processing, fall back to raw thumbnail if it fails
    try {
      const sharp = (await import('sharp')).default

      // Single-pass: greyscale → gamma darken → threshold
      const thresholded = await sharp(inputBuffer)
        .greyscale()
        .gamma(0.4)
        .threshold(80)
        .toBuffer()

      // One dilate pass to thicken lines
      const bolded = await sharp(thresholded)
        .negate()
        .blur(3.0)
        .negate()
        .threshold(200)
        .resize(232, 172, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer()

      return new NextResponse(new Uint8Array(bolded), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (sharpErr: any) {
      console.warn('Sharp processing failed, serving raw thumbnail:', sharpErr?.message)
      // Serve the raw Drive thumbnail as-is
      return new NextResponse(new Uint8Array(inputBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }
  } catch (error: any) {
    console.error('Drive thumbnail error:', error?.message)
    return new NextResponse(null, { status: 500 })
  }
}
