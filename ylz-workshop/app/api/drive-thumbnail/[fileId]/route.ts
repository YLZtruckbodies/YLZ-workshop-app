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

    // Process with sharp: greyscale → double-dilate → threshold
    // Two passes of negate→blur→negate makes lines much thicker and bolder
    const processed = await sharp(inputBuffer)
      .greyscale()
      // Pass 1: dilate lines
      .negate()
      .blur(2.5)
      .negate()
      .threshold(220)
      .toBuffer()

    // Pass 2: dilate again for extra thickness
    const bolded = await sharp(processed)
      .negate()
      .blur(2.0)
      .negate()
      .threshold(210)
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
