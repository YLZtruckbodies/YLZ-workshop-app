'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── If the quote is accepted (has a jobId), redirect to the jsheet so both
//     paths produce the exact same document. ────────────────────────────────

interface Quote {
  id: string
  quoteNumber: string
  customerName: string
  dealerName: string
  contactName: string
  contactPhone: string
  buildType: string
  configuration: Record<string, any>
  total: number
  overridePrice: number | null
  preparedBy: string
  notes: string
  jobId: string | null
  createdAt: string
}

function today() {
  return new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcBowHeight(material: string | undefined, bodyHeight: string | undefined): string {
  if (!material || !bodyHeight) return ''
  if (material === 'Aluminium') return '250mm'
  const h = parseInt(bodyHeight, 10)
  if (isNaN(h)) return ''
  if (h <= 1000) return '450mm'
  if (h === 1100) return '380mm'
  if (h >= 1150) return '450mm'
  return ''
}

// Shared CSS — identical to jsheet
const pageCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; font-size: 10pt; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 16mm; page-break-after: always; }
  .sheet:last-child { page-break-after: avoid; }

  .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .hdr-title { font-size: 22pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #1a1a1a; }
  .hdr-sub { font-size: 8.5pt; color: #666; margin-top: 3px; }
  .hdr-ylz { font-size: 16pt; font-weight: 900; color: #E8681A; text-align: right; }
  .hdr-ylzsub { font-size: 8pt; color: #888; margin-top: 2px; text-align: right; }
  .divider { height: 3px; background: #E8681A; margin-bottom: 12px; }

  .info-row { display: grid; gap: 8px; margin-bottom: 8px; }
  .info-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .info-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  .info-row-2 { grid-template-columns: 1fr 1fr; }
  .cell { border: 1px solid #ddd; border-radius: 4px; padding: 7px 10px; }
  .cell-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 4px; }
  .cell-val { font-size: 11pt; font-weight: 700; color: #1a1a1a; }
  .cell-val-sm { font-size: 9.5pt; font-weight: 700; color: #1a1a1a; }
  .cell-val-num { font-size: 14pt; font-weight: 900; color: #E8681A; }
  .cell-blank { border-bottom: 2px solid #1a1a1a; height: 22px; margin-top: 4px; }

  .section { margin-bottom: 10px; }
  .section-hdr { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
    color: #fff; background: #E8681A; padding: 4px 10px; margin-bottom: 0; }
  .section-body { border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; }

  .field-row { display: grid; border-bottom: 1px solid #f0f0f0; }
  .field-row:last-child { border-bottom: none; }
  .field-row-2 { grid-template-columns: 1fr 1fr; }
  .field-row-3 { grid-template-columns: 1fr 1fr 1fr; }
  .field-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
  .field-row-5 { grid-template-columns: 1fr 1fr 1fr 1fr 1fr; }
  .field { padding: 6px 10px; border-right: 1px solid #f0f0f0; }
  .field:last-child { border-right: none; }
  .field-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #999; margin-bottom: 3px; }
  .field-val { font-size: 9.5pt; color: #1a1a1a; font-weight: 600; }
  .field-blank { border-bottom: 1.5px solid #1a1a1a; height: 20px; margin-top: 3px; }

  .check-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #ddd; border-radius: 0 0 4px 4px; }
  .check-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; font-size: 9pt; }
  .check-item:nth-child(4n) { border-right: none; }
  .check-box { width: 12px; height: 12px; border: 1.5px solid #999; border-radius: 2px; flex-shrink: 0; }

  .notes-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; min-height: 50px; margin-bottom: 10px; }
  .notes-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; margin-bottom: 5px; }
  .notes-lines { display: flex; flex-direction: column; gap: 8px; }
  .notes-line { border-bottom: 1px solid #ddd; height: 18px; }
  .notes-text { font-size: 9.5pt; color: #333; white-space: pre-line; line-height: 1.5; }

  .signoff-hdr { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; border-bottom: 1px solid rgba(232,104,26,0.3); padding-bottom: 4px; margin-bottom: 8px; }
  .signoff-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .signoff-cell { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
  .signoff-stage { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
  .sig-line { border-bottom: 1px solid #ccc; height: 20px; margin-bottom: 6px; }
  .sig-lbl { font-size: 7.5pt; color: #bbb; }

  .print-bar { background: #1a1a1a; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 100; }
  .print-bar button { background: #E8681A; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 13px; }
  .print-bar a { color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none; }

  @media print {
    .print-bar { display: none !important; }
    .sheet { padding: 10mm 12mm; }
    @page { size: A4; margin: 0; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
`

export default function QuoteSheetPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/quotes/${params.id}`)
      .then(r => r.json())
      .then((data: Quote) => {
        // If accepted — redirect to the real job sheet so both paths are identical
        if (data.jobId) {
          router.replace(`/jsheet/${data.jobId}`)
          return
        }
        setQuote(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id, router])

  useEffect(() => {
    if (quote) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [quote])

  if (loading) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#666' }}>Loading…</div>
  if (!quote) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#c00' }}>Quote not found</div>

  const cfg = quote.configuration || {}
  // For truck-and-trailer builds, truck fields are nested under cfg.truckConfig.
  const c = (key: string) => {
    const val = cfg[key]
    if (val != null && val !== '') return String(val)
    // Fall back to truckConfig for truck-and-trailer builds
    const truckVal = (cfg.truckConfig as any)?.[key]
    if (truckVal != null && truckVal !== '') return String(truckVal)
    // valveBankType maps to the 'hydraulics' field saved by the quote builder
    if (key === 'valveBankType') {
      const hyd = cfg.hydraulics || (cfg.truckConfig as any)?.hydraulics
      if (hyd == null || hyd === '') return ''
      const hydStr = String(hyd)
      const mat = cfg.material || (cfg.truckConfig as any)?.material || ''
      const twinPn = String(mat).toLowerCase().includes('aluminium') ? '121.15.104' : '121.15.113'
      if (hydStr === 'Single spool valve') return 'Single spool valve — 121.8.185'
      if (hydStr === 'Truck and Trailer spool valve') return `Truck and Trailer spool valve — ${twinPn}`
      return hydStr
    }
    return ''
  }

  const bt = (quote.buildType || '').toLowerCase()
  const isTrailer = bt.includes('trailer') && !bt.includes('truck')
  const bodyLabel = isTrailer ? 'Trailer Body' : 'Truck Body'
  const makeStr = [c('chassisMake'), c('chassisModel'), c('chassisVariant') ? `(${c('chassisVariant')})` : ''].filter(Boolean).join(' ')

  return (
    <>
      <style>{pageCSS}</style>

      {/* Print bar */}
      <div className="print-bar">
        <a href={`/quotes/builder?id=${params.id}`}>← Back to quote</a>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{quote.quoteNumber} — {quote.customerName} — Job Sheets</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => window.open(`/qpdf/${params.id}`, '_blank')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>Quote PDF</button>
          <button onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      {/* ═══ SHEET 1 — FABRICATION ═══ */}
      <div className="sheet">
        <div className="hdr">
          <div>
            <div className="hdr-title">{bodyLabel} Job Sheet</div>
            <div className="hdr-sub">Workshop Copy — Fabrication</div>
          </div>
          <div>
            <div className="hdr-ylz">YLZ</div>
            <div className="hdr-ylzsub">YLZ Truck Bodies &amp; Trailers</div>
          </div>
        </div>
        <div className="divider" />

        <div className="info-row info-row-4">
          <div className="cell">
            <div className="cell-lbl">Job Number</div>
            <div className="cell-blank" />
          </div>
          <div className="cell">
            <div className="cell-lbl">Customer</div>
            <div className="cell-val-sm">{quote.customerName || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Dealer</div>
            <div className="cell-val-sm">{quote.dealerName || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Date Issued</div>
            <div className="cell-val-sm">{today()}</div>
          </div>
        </div>
        <div className="info-row info-row-4" style={{ marginBottom: 12 }}>
          <div className="cell">
            <div className="cell-lbl">Build Type</div>
            <div className="cell-val-sm">{quote.buildType || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Chassis / Make</div>
            <div className="cell-val-sm">{makeStr || ''}</div>
            {!makeStr && <div className="cell-blank" />}
          </div>
          <div className="cell">
            <div className="cell-lbl">Quote Ref</div>
            <div className="cell-val-sm">{quote.quoteNumber}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Drawing / Ref</div>
            <div className="cell-blank" />
          </div>
        </div>

        {/* Identity */}
        <div className="section">
          <div className="section-hdr">Identity &amp; VIN</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Serial No.</div><div className="field-val">{c('serial')}</div>{!c('serial') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">VIN</div><div className="field-val">{c('vin')}</div>{!c('vin') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Quote Ref</div><div className="field-val">{quote.quoteNumber}</div></div>
            </div>
          </div>
        </div>

        {/* Body Details */}
        <div className="section">
          <div className="section-hdr">Body Details</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Body Length (mm)</div><div className="field-val">{c('bodyLength')}</div>{!c('bodyLength') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Width (mm)</div><div className="field-val">{c('bodyWidth')}</div>{!c('bodyWidth') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Height (mm)</div><div className="field-val">{c('bodyHeight')}</div>{!c('bodyHeight') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Capacity (m³)</div><div className="field-val">{c('bodyCapacity')}</div>{!c('bodyCapacity') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Material</div><div className="field-val">{c('material')}</div>{!c('material') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Main Runner Width</div><div className="field-val">{c('mainRunnerWidth')}</div>{!c('mainRunnerWidth') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Floor Sheet</div><div className="field-val">{c('floorSheet')}</div>{!c('floorSheet') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Side Sheet</div><div className="field-val">{c('sideSheet')}</div>{!c('sideSheet') && <div className="field-blank" />}</div>
            </div>
            {isTrailer && (
              <div className="field-row field-row-4">
                <div className="field"><div className="field-lbl">Chassis Length (mm)</div><div className="field-val">{c('chassisLength')}</div>{!c('chassisLength') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Axle Make / Type</div><div className="field-val">{[c('axleMake'), c('axleType')].filter(Boolean).join(' ')}</div>{!c('axleMake') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Wheelbase (mm)</div><div className="field-val">{c('wheelbase')}</div>{!c('wheelbase') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Drawbar Length (mm)</div><div className="field-val">{c('drawbarLength')}</div>{!c('drawbarLength') && <div className="field-blank" />}</div>
              </div>
            )}
            {!isTrailer && (
              <div className="field-row field-row-2">
                <div className="field"><div className="field-lbl">Chassis Extension</div><div className="field-val">{c('chassisExtension')}</div>{!c('chassisExtension') && <div className="field-blank" />}</div>
                <div className="field" />
              </div>
            )}
          </div>
        </div>

        {/* Hoist & Controls */}
        <div className="section">
          <div className="section-hdr">Hoist &amp; Controls</div>
          <div className="section-body">
            <div className="field-row field-row-5">
              <div className="field"><div className="field-lbl">Hoist Model</div><div className="field-val">{c('hoist')}</div>{!c('hoist') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">C/L Pivot to Rear (mm)</div><div className="field-val">{c('pivotCentre')}</div>{!c('pivotCentre') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Hoist Controls</div><div className="field-val">{c('controls')}</div>{!c('controls') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Pump Type</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Hose Burst Valve</div><div className="field-val">{c('hoseBurstValve')}</div>{!c('hoseBurstValve') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Valve Bank */}
        <div className="section">
          <div className="section-hdr">Valve Bank</div>
          <div className="section-body">
            <div className="field-row field-row-2">
              <div className="field"><div className="field-lbl">Valve Bank Type</div><div className="field-val">{c('valveBankType')}</div>{!c('valveBankType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Notes</div><div className="field-val">{c('valveBankNotes')}</div>{!c('valveBankNotes') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* PTO Switch Type */}
        <div className="section">
          <div className="section-hdr">PTO Switch Type</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">PTO Type / Model</div><div className="field-val">{c('pto')}</div>{!c('pto') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Switch Type</div><div className="field-val">{c('ptoSwitchType') || c('controls')}</div>{!c('ptoSwitchType') && !c('controls') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Switch Location</div><div className="field-val">{c('ptoSwitchLocation')}</div>{!c('ptoSwitchLocation') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">PTO Notes</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Tailgate & Lock Flap */}
        <div className="section">
          <div className="section-hdr">Tailgate &amp; Lock Flap</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Tailgate Type</div><div className="field-val">{c('tailgateType')}</div>{!c('tailgateType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Lock Flap</div><div className="field-val">{c('lockFlap')}</div>{!c('lockFlap') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tailgate Controls</div><div className="field-val">{c('controls')}</div>{!c('controls') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Lights & Mudflaps */}
        <div className="section">
          <div className="section-hdr">Lights &amp; Mudflaps</div>
          <div className="section-body">
            <div className="field-row field-row-5">
              <div className="field"><div className="field-lbl">Tail Lights</div><div className="field-val">{c('tailLights')}</div>{!c('tailLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tailgate Lights</div><div className="field-val">{c('tailgateLights')}</div>{!c('tailgateLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Side Lights</div><div className="field-val">{c('sideLights')}</div>{!c('sideLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Anti-Spray</div><div className="field-val">{c('antiSpray')}</div>{!c('antiSpray') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Mudflaps</div><div className="field-val">{c('mudflaps')}</div>{!c('mudflaps') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Hydraulics */}
        <div className="section">
          <div className="section-hdr">Hydraulics</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Hydraulic System</div><div className="field-val">{c('hydraulics')}</div>{!c('hydraulics') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tank Type</div><div className="field-val">{c('hydTankType')}</div>{!c('hydTankType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tank Location</div><div className="field-val">{c('hydTankLocation')}</div>{!c('hydTankLocation') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Tarp System */}
        <div className="section">
          <div className="section-hdr">Tarp System</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Tarp Make / Model</div><div className="field-val">{c('tarpSystem')}</div>{!c('tarpSystem') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tarp Length (mm)</div><div className="field-val">{c('tarpLength')}</div>{!c('tarpLength') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tarp Colour</div><div className="field-val">{c('tarpColour')}</div>{!c('tarpColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Bow Height</div><div className="field-val">{calcBowHeight(c('material') as string, c('bodyHeight') as string) || c('tarpBowSize') as string || ''}</div>{!calcBowHeight(c('material') as string, c('bodyHeight') as string) && !c('tarpBowSize') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Coupling */}
        <div className="section">
          <div className="section-hdr">Coupling</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Coupling Type</div><div className="field-val">{c('coupling')}</div>{!c('coupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling')}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Suspension</div><div className="field-val">{c('suspension')}</div>{!c('suspension') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">PBS Rating</div><div className="field-val">{c('pbsRating')}</div>{!c('pbsRating') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Body Extras */}
        <div className="section">
          <div className="section-hdr">Body Extras</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Ladder Type</div><div className="field-val">{c('ladderType')}</div>{!c('ladderType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Ladder Position</div><div className="field-val">{c('ladderPosition')}</div>{!c('ladderPosition') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling')}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Spreader Chain</div><div className="field-val">{c('spreaderChain')}</div>{!c('spreaderChain') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-2">
              <div className="field"><div className="field-lbl">Shovel Holder</div><div className="field-val">{c('shovelHolder')}</div>{!c('shovelHolder') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Push Lugs</div><div className="field-val">{c('pushLugs')}</div>{!c('pushLugs') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Rear CAT Markers</div><div className="field-val">{c('catMarkers')}</div>{!c('catMarkers') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Reflectors</div><div className="field-val">{c('reflectors')}</div>{!c('reflectors') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Camera</div><div className="field-val">{c('camera')}</div>{!c('camera') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Vibrator</div><div className="field-val">{c('vibrator')}</div>{!c('vibrator') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Rear Signage */}
        <div className="section">
          <div className="section-hdr">Rear Signage</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Signage Type</div><div className="field-val">{c('rearSignageType')}</div>{!c('rearSignageType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Notes</div><div className="field-val">{c('rearSignageNotes')}</div>{!c('rearSignageNotes') && <div className="field-blank" />}</div>
              <div className="field" />
            </div>
          </div>
        </div>

        {/* Reverse Buzzer */}
        <div className="section">
          <div className="section-hdr">Reverse Buzzer / Squawker</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Buzzer / Squawker Type</div><div className="field-val">{c('reverseBuzzerType')}</div>{!c('reverseBuzzerType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Location</div><div className="field-val">{c('reverseBuzzerLocation')}</div>{!c('reverseBuzzerLocation') && <div className="field-blank" />}</div>
              <div className="field" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="notes-box">
          <div className="notes-lbl">Special Instructions / Notes</div>
          <div className="notes-text">
            {'Use drawings with _BW.pdf (flat pattern / cutting) and _BF.pdf (bent form / 3D view) for fabrication.'}
            {c('specialRequirements') ? `\n\n${c('specialRequirements')}` : ''}
            {quote.notes ? `\n\n${quote.notes}` : ''}
          </div>
        </div>

        {/* Sign-off */}
        <div>
          <div className="signoff-hdr">Fabrication Sign-Off</div>
          <div className="signoff-grid">
            {['Fabrication — Start', 'Fabrication — Complete', 'QA Check', 'Supervisor Approval'].map(s => (
              <div key={s} className="signoff-cell">
                <div className="signoff-stage">{s}</div>
                <div className="sig-line" />
                <div className="sig-lbl">Signed: ___________</div>
                <div style={{ height: 12 }} />
                <div className="sig-lbl">Date: _____________</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SHEET 2 — FITOUT ═══ */}
      <div className="sheet">
        <div className="hdr">
          <div>
            <div className="hdr-title">Fitout Job Sheet</div>
            <div className="hdr-sub">Workshop Copy — Fitout / Accessories</div>
          </div>
          <div>
            <div className="hdr-ylz">YLZ</div>
            <div className="hdr-ylzsub">YLZ Truck Bodies &amp; Trailers</div>
          </div>
        </div>
        <div className="divider" />

        <div className="info-row info-row-4" style={{ marginBottom: 14 }}>
          <div className="cell"><div className="cell-lbl">Job Number</div><div className="cell-blank" /></div>
          <div className="cell"><div className="cell-lbl">Customer</div><div className="cell-val-sm">{quote.customerName || '—'}</div></div>
          <div className="cell"><div className="cell-lbl">Build Type</div><div className="cell-val-sm">{quote.buildType || '—'}</div></div>
          <div className="cell"><div className="cell-lbl">Date</div><div className="cell-val-sm">{today()}</div></div>
        </div>

        {!isTrailer && (
          <div className="section">
            <div className="section-hdr">Truck Body Accessories</div>
            <div className="check-grid">
              {['Rope Rails', 'Toolbox LHS', 'Toolbox RHS', 'Underbody Toolbox', 'Water Cooler Holder', 'Ladder', 'Tow Hitch', 'Headboard', 'Cab Guard', 'Load Pegs', 'Grain Sides', 'Mesh Extensions', 'Drop Sides', 'Side Pegs', 'Rear Bumper', 'Mudflaps'].map(item => (
                <div key={item} className="check-item"><div className="check-box" /><span>{item}</span></div>
              ))}
            </div>
          </div>
        )}

        {isTrailer && (
          <div className="section">
            <div className="section-hdr">Trailer Accessories</div>
            <div className="check-grid">
              {['Mudguards', 'Spray Suppression', 'Side Markers', 'Reflectors', 'Air Reservoir', 'Water Tank', 'Fuel Tank', 'Air Dryer', 'Belly Plates', 'Chassis Toolbox', 'Jockey Wheel', 'Safety Chains', 'EBS File', 'VIN Plate', 'Axle Suspension Order', 'Lights & Wiring'].map(item => (
                <div key={item} className="check-item"><div className="check-box" /><span>{item}</span></div>
              ))}
            </div>
          </div>
        )}

        <div className="section" style={{ marginTop: 10 }}>
          <div className="section-hdr">Fitout Details</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Subframe Length (mm)</div><div className="field-val">Refer to drawing</div></div>
              <div className="field"><div className="field-lbl">Subframe Width (mm)</div><div className="field-val">Refer to drawing</div></div>
              <div className="field"><div className="field-lbl">Toolbox Size</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Suspension</div><div className="field-val">{c('suspension')}</div>{!c('suspension') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Axle Make / Count</div><div className="field-val">{[c('axleMake'), c('axleCount')].filter(Boolean).join(' / ')}</div>{!c('axleMake') && !c('axleCount') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Type</div><div className="field-val">{c('axleType')}</div>{!c('axleType') && <div className="field-blank" />}</div>
            </div>
            {(c('coupling') || c('brakeCoupling') || c('lockFlap')) && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Coupling</div><div className="field-val">{c('coupling')}</div>{!c('coupling') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling')}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Lock Flap</div><div className="field-val">{c('lockFlap')}</div>{!c('lockFlap') && <div className="field-blank" />}</div>
              </div>
            )}
            {(c('hydraulics') || c('hydTankType') || c('hydTankLocation')) && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Hydraulic System</div><div className="field-val">{c('hydraulics')}</div>{!c('hydraulics') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Tank Type</div><div className="field-val">{c('hydTankType')}</div>{!c('hydTankType') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Tank Location</div><div className="field-val">{c('hydTankLocation')}</div>{!c('hydTankLocation') && <div className="field-blank" />}</div>
              </div>
            )}
            {c('tarpSystem') && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Tarp System</div><div className="field-val">{c('tarpSystem')}</div></div>
                <div className="field"><div className="field-lbl">Hoist Model</div><div className="field-val">{c('hoist')}</div>{!c('hoist') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">PTO</div><div className="field-val">{c('pto')}</div>{!c('pto') && <div className="field-blank" />}</div>
              </div>
            )}
          </div>
        </div>

        <div className="notes-box" style={{ marginTop: 10 }}>
          <div className="notes-lbl">Special Instructions / Notes</div>
          <div className="notes-lines">
            <div className="notes-line" /><div className="notes-line" />
            <div className="notes-line" /><div className="notes-line" />
          </div>
        </div>

        <div>
          <div className="signoff-hdr">Fitout Sign-Off</div>
          <div className="signoff-grid">
            {['Fitout — Start', 'Fitout — Complete', 'QA Check', 'Supervisor Approval'].map(s => (
              <div key={s} className="signoff-cell">
                <div className="signoff-stage">{s}</div>
                <div className="sig-line" />
                <div className="sig-lbl">Signed: ___________</div>
                <div style={{ height: 12 }} />
                <div className="sig-lbl">Date: _____________</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SHEET 3 — PAINT ═══ */}
      <div className="sheet">
        <div className="hdr">
          <div>
            <div className="hdr-title">Paint Job Sheet</div>
            <div className="hdr-sub">Workshop Copy — Paint &amp; Finish</div>
          </div>
          <div>
            <div className="hdr-ylz">YLZ</div>
            <div className="hdr-ylzsub">YLZ Truck Bodies &amp; Trailers</div>
          </div>
        </div>
        <div className="divider" />

        <div className="info-row info-row-4" style={{ marginBottom: 14 }}>
          <div className="cell"><div className="cell-lbl">Job Number</div><div className="cell-blank" /></div>
          <div className="cell"><div className="cell-lbl">Customer</div><div className="cell-val-sm">{quote.customerName || '—'}</div></div>
          <div className="cell"><div className="cell-lbl">Build Type</div><div className="cell-val-sm">{quote.buildType || '—'}</div></div>
          <div className="cell"><div className="cell-lbl">Date</div><div className="cell-val-sm">{today()}</div></div>
        </div>

        <div className="section">
          <div className="section-hdr">Paint Specification</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Paint Colour</div><div className="field-val">{c('paintColour')}</div>{!c('paintColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Paint Spec</div><div className="field-val">{c('paintSpec') || (c('paintColour') ? 'To match cab' : '')}</div>{!c('paintSpec') && !c('paintColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Paint Code</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Paint Brand</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Finish</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Primer</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Coats</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Material</div><div className="field-val">{c('material')}</div>{!c('material') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-hdr">Areas to Paint</div>
          <div className="check-grid">
            {['Body — Inside', 'Body — Outside', 'Headboard', 'Tailgate', 'Subframe', 'Mudguards / Mudflaps', 'Toolboxes', 'Cab Guard', 'Chassis (Trailer)', 'Drawbar', 'Running Gear', 'Underbody'].map(item => (
              <div key={item} className="check-item"><div className="check-box" /><span>{item}</span></div>
            ))}
          </div>
        </div>

        <div className="notes-box" style={{ marginTop: 10 }}>
          <div className="notes-lbl">Special Instructions / Masking Notes</div>
          <div className="notes-lines">
            <div className="notes-line" /><div className="notes-line" />
            <div className="notes-line" /><div className="notes-line" />
          </div>
        </div>

        <div>
          <div className="signoff-hdr">Paint Sign-Off</div>
          <div className="signoff-grid">
            {['Prep / Blast', 'Primer', 'Top Coat', 'QA / Final'].map(s => (
              <div key={s} className="signoff-cell">
                <div className="signoff-stage">{s}</div>
                <div className="sig-line" />
                <div className="sig-lbl">Signed: ___________</div>
                <div style={{ height: 12 }} />
                <div className="sig-lbl">Date: _____________</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
