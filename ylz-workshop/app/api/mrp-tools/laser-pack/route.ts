import { NextRequest, NextResponse } from 'next/server'
// Use lib directly to avoid pdf-parse test-file check that breaks Vercel builds
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
import { parseMO } from '@/lib/parseMO'
import { generateLaserSheet, type DrawingMap } from '@/lib/generateSheet'

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
    const parsed = await pdfParse(buffer)
    const mo     = parseMO(parsed.text)

    if (mo.moNumber === 'Unknown') {
      return NextResponse.json(
        { error: 'Could not read MO number — make sure this is an MRPeasy Manufacturing Order PDF.' },
        { status: 422 }
      )
    }

    const drawings: DrawingMap = new Map()
    const drawingFiles = formData.getAll('drawing') as File[]
    for (const df of drawingFiles) {
      const partMatch = df.name.match(/(\d{3}-\d{2}-\d{3})/)
      if (partMatch) {
        const bytes = new Uint8Array(await df.arrayBuffer())
        drawings.set(partMatch[1], bytes)
      }
    }

    const pdfBytes = await generateLaserSheet(mo, drawings)

    const parts = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
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
          partNumbers:   parts.map(p => p.partNumber),
          drawingsFound: Array.from(drawings.keys()),
        }),
      },
    })
  } catch (err) {
    console.error('Laser pack error:', err)
    return NextResponse.json({ error: 'Failed to process PDF.' }, { status: 500 })
  }
}
