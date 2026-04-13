import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * GET /api/drive-thumbnail/[fileId]
 * Proxies a Google Drive file thumbnail with image processing to make
 * thin DXF lines bold and clearly visible.
 *
 * Processing pipeline:
 * 1. Fetch hi-res thumbnail from Drive API
 * 2. Convert to greyscale
 * 3. Threshold to pure black/white (makes faint lines solid black)
 * 4. Dilate (thicken) all black lines by applying a blur then re-threshold
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const drive = await getDriveClient()

    // Get fresh thumbnail link from Drive API (supportsAllDrives for Shared Drive files)
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
    const hiResUrl = thumbUrl.replace(/=s\d+$/, '=s800')

    // Fetch the actual thumbnail image
    const imgRes = await fetch(hiResUrl)
    if (!imgRes.ok) {
      return new NextResponse(null, { status: 502 })
    }

    const inputBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Step 1: Greyscale + gamma to darken mid-tones, then extreme contrast
    let buf = await sharp(inputBuffer)
      .greyscale()
      .gamma(0.3)              // gamma < 1 darkens mid-tones massively
      .linear(10.0, -1200)     // nuclear contrast boost
      .threshold(50)           // catch absolutely everything
      .toBuffer()

    // Step 2: Dilate 10 times with large blur for very thick lines
    for (let i = 0; i < 10; i++) {
      buf = await sharp(buf)
        .negate()
        .blur(5.0)
        .negate()
        .threshold(160)
        .toBuffer()
    }

    const bolded = await sharp(buf)
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(bolded), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error: any) {
    console.error('Drive thumbnail error:', error?.message)
    return new NextResponse(null, { status: 500 })
  }
}
