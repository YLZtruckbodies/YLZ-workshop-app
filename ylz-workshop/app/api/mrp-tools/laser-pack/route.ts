import { NextRequest, NextResponse } from 'next/server'
import { parseMO } from '@/lib/parseMO'
import { generateLaserSheet } from '@/lib/generateSheet'
import { fetchPartDrawings } from '@/lib/drive'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a valid PDF file.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Require inside the handler to avoid pdf-parse test-file check at module load
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const parsed = await pdfParse(buffer)
    const mo = parseMO(parsed.text)

    if (mo.moNumber === 'Unknown') {
      return NextResponse.json(
        { error: 'Could not read MO number — make sure this is an MRPeasy Manufacturing Order PDF.' },
        { status: 422 }
      )
    }

    const parts = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
    const partNumbers = parts.map(p => p.partNumber)

    // Auto-fetch drawings from Google Drive YLZparts folder
    const drawings = await fetchPartDrawings(partNumbers)

    const pdfBytes = await generateLaserSheet(mo, drawings)

    return new NextResponse(Buffer.from(pdfBytes), {
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
    console.error('Laser pack error:', err)
    const message = err instanceof Error ? err.message : 'Failed to process PDF.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
