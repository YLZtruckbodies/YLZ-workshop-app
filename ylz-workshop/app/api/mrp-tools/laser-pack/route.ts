import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText }   from '@/lib/extractPdfText'
import { parseMO }          from '@/lib/parseMO'
import { generateLaserSheet } from '@/lib/generateSheet'
import { fetchPartDrawings } from '@/lib/drive'

export const runtime    = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'init'
  try {
    step = 'read-form'
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a valid PDF file.' }, { status: 400 })
    }

    step = 'read-buffer'
    const buffer = Buffer.from(await file.arrayBuffer())

    step = 'extract-text'
    const text = await extractPdfText(buffer)

    step = 'parse-mo'
    const mo = parseMO(text)

    if (mo.moNumber === 'Unknown') {
      return NextResponse.json(
        { error: 'Could not read MO number — make sure this is an MRPeasy Manufacturing Order PDF.' },
        { status: 422 }
      )
    }

    const parts       = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
    const partNumbers = parts.map(p => p.partNumber)

    step = 'fetch-drawings'
    // MRP-04: if Google credentials aren't configured, skip drawings gracefully
    let drawings: Awaited<ReturnType<typeof fetchPartDrawings>>
    const hasGoogleCreds = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    )
    if (hasGoogleCreds) {
      drawings = await fetchPartDrawings(partNumbers)
    } else {
      console.warn('Google credentials not configured — skipping part drawings')
      drawings = new Map()
    }

    step = 'generate-sheet'
    const pdfBuffer = await generateLaserSheet(mo, drawings)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${mo.moNumber} Laser Sheet.pdf"`,
        'X-MO-Data': JSON.stringify({
          moNumber:      mo.moNumber,
          product:       mo.product,
          quantity:      mo.quantity,
          date:          mo.date,
          totalParts:    mo.parts.length,
          laserParts:    mo.laserParts.length,
          partNumbers,
          drawingsFound: Array.from(drawings.keys()),
        }),
      },
    })
  } catch (err) {
    console.error(`Laser pack error at step [${step}]:`, err)
    const message = err instanceof Error
      ? `[${step}] ${err.message}`
      : `[${step}] Failed to process PDF.`
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
