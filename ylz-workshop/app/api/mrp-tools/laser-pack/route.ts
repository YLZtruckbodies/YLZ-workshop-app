// !! Polyfills MUST be the first import — pdfjs-dist (inside pdf-parse) needs
//    DOMMatrix/DOMPoint at module-init time, before any other code runs.
import '@/lib/node-polyfills'

import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: object) => Promise<{ text: string }>
import { parseMO } from '@/lib/parseMO'
import { generateLaserSheet } from '@/lib/generateSheet'
import { fetchPartDrawings } from '@/lib/drive'

export const runtime = 'nodejs'
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

    step = 'pdf-parse'
    const parsed = await pdfParse(buffer)

    step = 'parse-mo'
    const mo = parseMO(parsed.text)

    if (mo.moNumber === 'Unknown') {
      return NextResponse.json(
        { error: 'Could not read MO number — make sure this is an MRPeasy Manufacturing Order PDF.' },
        { status: 422 }
      )
    }

    const parts       = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
    const partNumbers = parts.map(p => p.partNumber)

    step = 'fetch-drawings'
    const drawings  = await fetchPartDrawings(partNumbers)

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
    console.error('Laser pack error:', err)
    const message = err instanceof Error
      ? `[step:${step}] ${err.message}`
      : `[step:${step}] Failed to process PDF.`
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
