import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { VIN_PLATE_LOOKUP, normaliseBrand, normaliseBrake } from '@/lib/vin-plate-lookup'

const MM = 2.8346 // mm → pt

function pt(mm: number) { return mm * MM }

export async function POST(req: NextRequest) {
  try {
    const { axles, axleMake, axleType, vin, date } = await req.json()

    const brand = normaliseBrand(axleMake)
    const brake = normaliseBrake(axleType)
    const key = `${axles}-${brand}-${brake}`
    const cfg = VIN_PLATE_LOOKUP[key]

    if (!cfg) {
      return NextResponse.json({ error: `No VIN plate config found for ${key}` }, { status: 400 })
    }
    if (!vin || String(vin).length !== 17) {
      return NextResponse.json({ error: 'VIN must be exactly 17 characters' }, { status: 400 })
    }
    if (!date) {
      return NextResponse.json({ error: 'Date (MM/YY) is required' }, { status: 400 })
    }

    // ── Page layout ────────────────────────────────────────────────────────────
    const W = pt(297), H = pt(210)          // landscape A4
    const pw = pt(200), ph = pt(130)         // plate dimensions
    const px = (W - pw) / 2, py = (H - ph) / 2
    const lx = px + pt(16)                  // left text anchor
    const cx = px + pw / 2                  // plate centre x
    const cw = pw / 3                       // CTA column width

    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true })

    // ── Plate background ───────────────────────────────────────────────────────
    doc.roundedRect(px, py, pw, ph, pt(5)).fillAndStroke('#E7E8E9', '#373535')

    // ── Corner rivets ──────────────────────────────────────────────────────────
    doc.lineWidth(0.3 * MM)
    for (const [rx, ry] of [
      [px + pt(5), py + pt(5)],
      [px + pw - pt(5), py + pt(5)],
      [px + pt(5), py + ph - pt(5)],
      [px + pw - pt(5), py + ph - pt(5)],
    ] as [number, number][]) {
      doc.circle(rx, ry, pt(2.5)).fillAndStroke('#C0C2C5', '#999999')
    }

    doc.fillColor('#323232')

    let y = py + pt(22)

    // ── MAKE-MODEL ─────────────────────────────────────────────────────────────
    doc.fontSize(9).font('Helvetica').text('MAKE-MODEL', lx, y, { lineBreak: false })
    doc.fontSize(10).font('Helvetica-Bold').text(cfg.makeModel, px, y, { width: pw, align: 'center', lineBreak: false })

    // ── VTA + DATE ─────────────────────────────────────────────────────────────
    y += pt(14)
    doc.fontSize(9).font('Helvetica').text('VTA', lx, y, { lineBreak: false })
    doc.font('Helvetica-Bold').text(cfg.vta, lx + pt(18), y, { lineBreak: false })
    doc.font('Helvetica').text('DATE', cx + pt(18), y, { lineBreak: false })
    doc.font('Helvetica-Bold').text(date, cx + pt(36), y, { lineBreak: false })

    // ── ATM + GTM ──────────────────────────────────────────────────────────────
    y += pt(14)
    doc.fontSize(9).font('Helvetica').text('ATM', lx, y, { lineBreak: false })
    doc.font('Helvetica-Bold').text(cfg.atm, lx + pt(18), y, { lineBreak: false })
    doc.font('Helvetica').text('kg', lx + pt(40), y, { lineBreak: false })
    doc.font('Helvetica').text('GTM', cx + pt(18), y, { lineBreak: false })
    doc.font('Helvetica-Bold').text(cfg.gtm, cx + pt(36), y, { lineBreak: false })
    doc.font('Helvetica').text('kg', cx + pt(58), y, { lineBreak: false })

    // ── VIN ────────────────────────────────────────────────────────────────────
    y += pt(14)
    doc.fontSize(9).font('Helvetica').text('VIN', cx - pt(30), y, { lineBreak: false })
    doc.fontSize(11).font('Helvetica-Bold').text(String(vin).toUpperCase(), px, y, { width: pw, align: 'center', lineBreak: false })

    // ── Brake heading ──────────────────────────────────────────────────────────
    y += pt(14)
    doc.fontSize(7.5).font('Helvetica').text(
      'BRAKE SYSTEM COMPONENT TYPE APPROVAL NUMBERS',
      px, y, { width: pw, align: 'center', lineBreak: false }
    )

    // ── CTA row 1 ──────────────────────────────────────────────────────────────
    y += pt(10)
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text(cfg.fb1, px,          y, { width: cw, align: 'center', lineBreak: false })
    doc.text(cfg.ss1, px + cw,     y, { width: cw, align: 'center', lineBreak: false })
    doc.text(cfg.cs1, px + cw * 2, y, { width: cw, align: 'center', lineBreak: false })

    // ── CTA row 2 ──────────────────────────────────────────────────────────────
    y += pt(10)
    doc.text(cfg.fb2, px,          y, { width: cw, align: 'center', lineBreak: false })
    doc.text(cfg.ss2, px + cw,     y, { width: cw, align: 'center', lineBreak: false })
    doc.text(cfg.cs2, px + cw * 2, y, { width: cw, align: 'center', lineBreak: false })

    // ── Manufacturer ───────────────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica').text(
      cfg.manufacturer,
      px, py + ph - pt(14),
      { width: pw, align: 'center', lineBreak: false }
    )

    // ── Stream to buffer ───────────────────────────────────────────────────────
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="VIN-Plate-${vin}.pdf"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate VIN plate PDF' }, { status: 500 })
  }
}
