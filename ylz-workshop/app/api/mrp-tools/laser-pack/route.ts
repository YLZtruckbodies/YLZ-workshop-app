import { NextRequest, NextResponse } from 'next/server'
import { extractPdfText }   from '@/lib/extractPdfText'
import { parseMO }          from '@/lib/parseMO'
import { generateLaserSheet } from '@/lib/generateSheet'
import { fetchPartDrawings } from '@/lib/drive'
import type { MOPart } from '@/lib/parseMO'

export const runtime    = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let step = 'init'
  try {
    step = 'read-form'
    const formData = await req.formData()
    const files = formData.getAll('pdf') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No PDFs uploaded.' }, { status: 400 })
    }

    const allLaserParts: (MOPart & { moNumber: string })[] = []
    const moNumbers: string[] = []
    let firstProduct  = ''
    let firstQuantity = ''
    let firstDate     = ''

    step = 'parse-mos'
    for (const file of files) {
      if (file.type !== 'application/pdf') continue
      const buffer = Buffer.from(await file.arrayBuffer())
      const text   = await extractPdfText(buffer)
      const mo     = parseMO(text)

      if (mo.moNumber === 'Unknown') {
        console.warn('parseMO: could not extract MO number. Text preview:', text.substring(0, 500))
      }

      moNumbers.push(mo.moNumber)
      if (!firstProduct)  firstProduct  = mo.product
      if (!firstQuantity) firstQuantity = mo.quantity
      if (!firstDate)     firstDate     = mo.date

      const parts = mo.laserParts.length > 0 ? mo.laserParts : mo.parts
      for (const part of parts) {
        allLaserParts.push({ ...part, moNumber: mo.moNumber })
      }
    }

    if (!moNumbers.length) {
      return NextResponse.json({ error: 'No valid PDF files found.' }, { status: 400 })
    }

    const allPartNumbers = allLaserParts.map(p => p.partNumber)

    step = 'fetch-drawings'
    let drawings: Awaited<ReturnType<typeof fetchPartDrawings>>
    const hasGoogleCreds = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    )
    if (hasGoogleCreds) {
      drawings = await fetchPartDrawings(allPartNumbers)
    } else {
      console.warn('Google credentials not configured — skipping part drawings')
      drawings = new Map()
    }

    step = 'generate-sheet'
    const pdfBuffer = await generateLaserSheet(
      {
        moNumbers,
        laserParts: allLaserParts,
        date:     firstDate     || new Date().toLocaleDateString('en-AU'),
        product:  moNumbers.length === 1 ? firstProduct  : `${moNumbers.length} MOs`,
        quantity: moNumbers.length === 1 ? firstQuantity : '—',
      },
      drawings
    )

    const fileLabel = moNumbers.length === 1
      ? moNumbers[0]
      : `Combined (${moNumbers.length} MOs)`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileLabel} Laser Sheet.pdf"`,
        'X-MO-Data': JSON.stringify({
          moNumbers,
          product:       moNumbers.length === 1 ? firstProduct  : `${moNumbers.length} MOs`,
          quantity:      moNumbers.length === 1 ? firstQuantity : '—',
          date:          firstDate,
          totalParts:    allLaserParts.length,
          laserParts:    allLaserParts.length,
          partNumbers:   allPartNumbers,
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
