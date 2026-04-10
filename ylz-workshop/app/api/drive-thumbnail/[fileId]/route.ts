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

    const inputBuffer = Buffer.from(await imgRes.arrayBuffer())

    // Request even higher res thumbnail for more detail
    const hiRes2 = hiResUrl.replace(/=s\d+$/, '=s1600')
    const imgRes2 = await fetch(hiRes2).catch(() => null)
    const srcBuffer = (imgRes2?.ok)
      ? Buffer.from(await imgRes2.arrayBuffer())
      : inputBuffer

    // Process: greyscale → 4x dilate passes → final threshold
    // Each pass spreads dark pixels outward, making every line much thicker
    let buf = await sharp(srcBuffer)
      .greyscale()
      .negate()
      .blur(4.0)
      .negate()
      .threshold(235)
      .toBuffer()

    for (let i = 0; i < 3; i++) {
      buf = await sharp(buf)
        .negate()
        .blur(3.5)
        .negate()
        .threshold(225)
        .toBuffer()
    }

    // Final output — resize down to thumbnail size for crisp lines
    const bolded = await sharp(buf)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
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
