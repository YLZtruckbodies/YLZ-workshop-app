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

    // Process with sharp: greyscale → negate → blur (dilate) → negate → threshold
    // This makes thin lines thick and solid black on white background
    const processed = await sharp(inputBuffer)
      .greyscale()
      // Negate so lines become white on black
      .negate()
      // Blur spreads the white lines outward (dilation effect)
      .blur(1.5)
      // Negate back so lines are black on white
      .negate()
      // Hard threshold: anything darker than 200 becomes pure black
      .threshold(200)
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(processed), {
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
