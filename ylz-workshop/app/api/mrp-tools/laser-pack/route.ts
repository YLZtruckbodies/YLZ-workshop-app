import { NextRequest, NextResponse } from 'next/server'
import { parseMO } from '@/lib/parseMO'
import { generateLaserSheet } from '@/lib/generateSheet'
import { fetchPartDrawings } from '@/lib/drive'

export const runtime = 'nodejs'
export const maxDuration = 60

// DOMMatrix polyfill for Node.js 18 — required by pdfjs-dist inside pdf-parse v2
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    is2D = true; isIdentity = true
    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = this.m11 = init[0]; this.b = this.m12 = init[1]
        this.c = this.m21 = init[2]; this.d = this.m22 = init[3]
        this.e = this.m41 = init[4]; this.f = this.m42 = init[5]
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Please upload a valid PDF file.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

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

    const parts      = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
    const partNumbers = parts.map(p => p.partNumber)

    const drawings = await fetchPartDrawings(partNumbers)
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
    const message = err instanceof Error ? err.message : 'Failed to process PDF.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
