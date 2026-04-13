'use client'

import { useEffect, useState } from 'react'

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
  lineItems: { description: string; totalPrice: number }[]
  createdAt: string
  jobId: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtNum(val: string | number | undefined): string {
  if (!val) return ''
  const n = typeof val === 'number' ? val : Number(String(val).replace(/[^\d.]/g, ''))
  return isNaN(n) ? String(val) : n.toLocaleString('en-AU')
}

function SpecRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <tr>
      <td className="spec-label">{label}</td>
      <td className="spec-value">{String(value)}</td>
    </tr>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={2} className="spec-section">{title}</td>
    </tr>
  )
}

// Detect build type robustly from the stored label string
function parseBuildType(buildType: string): { isTruck: boolean; isTrailer: boolean; isCombo: boolean } {
  const bt = (buildType || '').toLowerCase()
  // Combo first — must have both words
  const isCombo = bt.includes('truck') && bt.includes('trailer')
  const isTruck = bt.includes('truck')
  const isTrailer = bt.includes('trailer') && !isTruck  // trailer-only
  return { isTruck: isTruck && !isCombo, isTrailer: isTrailer && !isCombo, isCombo }
}

function buildTruckRows(c: Record<string, any>, prefix = '', label = 'Truck Body') {
  const rows: React.ReactElement[] = []

  rows.push(<SectionHeader key={`${prefix}-id-hdr`} title={`${label} — Identity`} />)
  rows.push(<SpecRow key={`${prefix}-serial`} label="Serial No." value={c.serial} />)
  rows.push(<SpecRow key={`${prefix}-vin`} label="VIN" value={c.vin} />)
  if (c.chassisMake || c.chassisModel) {
    rows.push(<SpecRow key={`${prefix}-chassis`} label="Chassis" value={[c.chassisMake, c.chassisModel].filter(Boolean).join(' ')} />)
  }

  rows.push(<SectionHeader key={`${prefix}-body-hdr`} title={`${label} — Dimensions`} />)
  rows.push(<SpecRow key={`${prefix}-mat`} label="Body Material" value={c.material} />)
  if (c.bodyLength || c.bodyWidth || c.bodyHeight) {
    rows.push(<SpecRow key={`${prefix}-dims`} label="Body Dimensions (mm)" value={
      [c.bodyLength && `${c.bodyLength}L`, c.bodyWidth && `${c.bodyWidth}W`, c.bodyHeight && `${c.bodyHeight}H`].filter(Boolean).join(' × ')
    } />)
  }
  rows.push(<SpecRow key={`${prefix}-runner`} label="Main Runner Width (mm)" value={c.mainRunnerWidth} />)
  rows.push(<SpecRow key={`${prefix}-cap`} label="Capacity" value={c.bodyCapacity ? `${c.bodyCapacity} m³` : null} />)
  rows.push(<SpecRow key={`${prefix}-gvm`} label="GVM" value={c.gvm ? `${fmtNum(c.gvm)} kg` : null} />)
  rows.push(<SpecRow key={`${prefix}-tare`} label="Tare (est.)" value={c.tare ? `${fmtNum(c.tare)} kg` : null} />)
  rows.push(<SpecRow key={`${prefix}-paint`} label="Paint Colour" value={c.paintColour} />)
  rows.push(<SpecRow key={`${prefix}-floor`} label="Floor Sheet" value={c.floorSheet} />)
  rows.push(<SpecRow key={`${prefix}-side`} label="Side Sheet" value={c.sideSheet} />)
  rows.push(<SpecRow key={`${prefix}-front`} label="Front Sheet" value={c.frontSheet} />)

  rows.push(<SectionHeader key={`${prefix}-hoist-hdr`} title={`${label} — Hoist & Controls`} />)
  rows.push(<SpecRow key={`${prefix}-hoist`} label="Hoist Model" value={c.hoist !== 'None' ? c.hoist : null} />)
  rows.push(<SpecRow key={`${prefix}-pto`} label="PTO" value={c.pto !== 'None' ? c.pto : null} />)
  rows.push(<SpecRow key={`${prefix}-ctrl`} label="Hoist Controls" value={c.controls !== 'None' ? c.controls : null} />)
  rows.push(<SpecRow key={`${prefix}-coup`} label="Coupling" value={c.coupling !== 'None' ? c.coupling : null} />)
  rows.push(<SpecRow key={`${prefix}-dval`} label="D-Value (kN)" value={c.dValue} />)
  rows.push(<SpecRow key={`${prefix}-cload`} label="Coupling Vertical Load" value={c.couplingLoad} />)
  rows.push(<SpecRow key={`${prefix}-tail`} label="Tailgate Type" value={c.tailgateType} />)

  rows.push(<SectionHeader key={`${prefix}-hyd-hdr`} title={`${label} — Hydraulics`} />)
  rows.push(<SpecRow key={`${prefix}-hyd`} label="Hydraulic System" value={c.hydraulics !== 'None' ? c.hydraulics : null} />)
  rows.push(<SpecRow key={`${prefix}-hydtype`} label="Tank Type" value={c.hydTankType} />)
  rows.push(<SpecRow key={`${prefix}-hydloc`} label="Tank Location" value={c.hydTankLocation} />)

  rows.push(<SectionHeader key={`${prefix}-tarp-hdr`} title={`${label} — Tarp System`} />)
  rows.push(<SpecRow key={`${prefix}-tarp`} label="Tarp" value={c.tarpSystem !== 'None' ? c.tarpSystem : 'None (no tarp)'} />)

  rows.push(<SectionHeader key={`${prefix}-lights-hdr`} title={`${label} — Lighting`} />)
  rows.push(<SpecRow key={`${prefix}-tlights`} label="Tailgate Lights" value={c.tailgateLights !== 'None' ? c.tailgateLights : 'None'} />)

  return rows
}

function buildTrailerRows(c: Record<string, any>, prefix = '') {
  const rows: React.ReactElement[] = []

  rows.push(<SectionHeader key={`${prefix}-id-hdr`} title="Trailer — Identity" />)
  rows.push(<SpecRow key={`${prefix}-serial`} label="Serial No." value={c.serial} />)
  rows.push(<SpecRow key={`${prefix}-vin`} label="VIN" value={c.vin} />)
  rows.push(<SpecRow key={`${prefix}-model`} label="Trailer Model" value={c.trailerModel} />)
  rows.push(<SpecRow key={`${prefix}-ttype`} label="Chassis Type" value={c.trailerType} />)

  rows.push(<SectionHeader key={`${prefix}-chassis-hdr`} title="Trailer — Chassis" />)
  rows.push(<SpecRow key={`${prefix}-chassislen`} label="Chassis Length (mm)" value={c.chassisLength} />)
  rows.push(<SpecRow key={`${prefix}-wb`} label="Wheelbase (mm)" value={c.wheelbase} />)
  rows.push(<SpecRow key={`${prefix}-drawbar`} label="Drawbar Length (mm)" value={c.drawbarLength} />)

  rows.push(<SectionHeader key={`${prefix}-body-hdr`} title="Trailer — Body Dimensions" />)
  rows.push(<SpecRow key={`${prefix}-tmat`} label="Material" value={c.material} />)
  if (c.bodyLength || c.bodyWidth || c.bodyHeight) {
    rows.push(<SpecRow key={`${prefix}-dims`} label="Body Dimensions (mm)" value={
      [c.bodyLength && `${c.bodyLength}L`, c.bodyWidth && `${c.bodyWidth}W`, c.bodyHeight && `${c.bodyHeight}H`].filter(Boolean).join(' × ')
    } />)
  }
  rows.push(<SpecRow key={`${prefix}-runner`} label="Main Runner Width (mm)" value={c.mainRunnerWidth} />)
  rows.push(<SpecRow key={`${prefix}-cap`} label="Capacity" value={c.bodyCapacity ? `${c.bodyCapacity} m³` : null} />)
  rows.push(<SpecRow key={`${prefix}-paint`} label="Paint Colour" value={c.paintColour} />)
  rows.push(<SpecRow key={`${prefix}-floor`} label="Floor Sheet" value={c.floorSheet} />)
  rows.push(<SpecRow key={`${prefix}-side`} label="Side Sheet" value={c.sideSheet} />)

  rows.push(<SectionHeader key={`${prefix}-hoist-hdr`} title="Trailer — Hoist" />)
  rows.push(<SpecRow key={`${prefix}-hoist`} label="Hoist Model" value={c.hoist !== 'None' ? c.hoist : null} />)

  rows.push(<SectionHeader key={`${prefix}-weights-hdr`} title="Trailer — Weights" />)
  rows.push(<SpecRow key={`${prefix}-gtm`} label="GTM" value={c.gtm ? `${fmtNum(c.gtm)} kg` : null} />)
  rows.push(<SpecRow key={`${prefix}-gcm`} label="GCM" value={c.gcm ? `${fmtNum(c.gcm)} kg` : null} />)
  rows.push(<SpecRow key={`${prefix}-tare`} label="Tare (est.)" value={c.tare ? `${fmtNum(c.tare)} kg` : null} />)
  if (c.pbsRating) rows.push(<SpecRow key={`${prefix}-pbs`} label="PBS Rating" value={c.pbsRating} />)

  rows.push(<SectionHeader key={`${prefix}-gear-hdr`} title="Trailer — Running Gear" />)
  rows.push(<SpecRow key={`${prefix}-axle`} label="Axle Make" value={c.axleMake} />)
  rows.push(<SpecRow key={`${prefix}-acnt`} label="Axle Count" value={c.axleCount} />)
  rows.push(<SpecRow key={`${prefix}-atype`} label="Axle Type / Brakes" value={c.axleType} />)
  rows.push(<SpecRow key={`${prefix}-susp`} label="Suspension" value={c.suspension} />)

  rows.push(<SectionHeader key={`${prefix}-tarp-hdr`} title="Trailer — Tarp System" />)
  rows.push(<SpecRow key={`${prefix}-tarp`} label="Tarp" value={c.tarpSystem !== 'None' ? c.tarpSystem : 'None (no tarp)'} />)

  rows.push(<SectionHeader key={`${prefix}-ctrl-hdr`} title="Trailer — Controls" />)
  rows.push(<SpecRow key={`${prefix}-lockflap`} label="Trailer Lock Flap" value={c.lockFlap} />)

  rows.push(<SectionHeader key={`${prefix}-lights-hdr`} title="Trailer — Lighting" />)
  rows.push(<SpecRow key={`${prefix}-tlights`} label="Tailgate Lights" value={c.tailgateLights !== 'None' ? c.tailgateLights : 'None'} />)

  return rows
}

export default function JobSheetPrintPage({ params }: { params: { id: string } }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [jobNum, setJobNum] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    fetch(`/api/quotes/${params.id}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then((data) => {
        clearTimeout(timeout)
        setQuote(data)
        setLoading(false)
        // Fetch job number in background — doesn't block render
        if (data.jobId) {
          fetch(`/api/jobs/${data.jobId}`)
            .then((jr) => jr.ok ? jr.json() : null)
            .then((job) => { if (job?.num) setJobNum(job.num) })
            .catch(() => {})
        }
      })
      .catch(() => { clearTimeout(timeout); setLoading(false) })
    return () => { clearTimeout(timeout); controller.abort() }
  }, [params.id])

  useEffect(() => {
    if (quote) {
      const timer = setTimeout(() => window.print(), 600)
      return () => clearTimeout(timer)
    }
  }, [quote])

  if (loading) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#666' }}>Loading…</div>
  if (!quote) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#c00' }}>Quote not found</div>

  const { isTruck, isTrailer, isCombo } = parseBuildType(quote.buildType)
  const cfg = quote.configuration
  const effectiveTotal = quote.overridePrice ?? quote.total
  const specialReqs = cfg.specialRequirements as string | undefined

  // Build spec rows based on build type
  const specRows: React.ReactElement[] = []
  if (isCombo) {
    specRows.push(...buildTruckRows(cfg.truckConfig || {}, 'tc', 'Truck Body'))
    specRows.push(...buildTrailerRows(cfg.trailerConfig || {}, 'trc'))
    if ((cfg.truckConfig || cfg.trailerConfig)?.pbsRating || cfg.pbsRating) {
      specRows.push(<SpecRow key="combo-pbs" label="Combo PBS Rating" value={cfg.pbsRating} />)
    }
  } else if (isTruck) {
    specRows.push(...buildTruckRows(cfg, 'tk', 'Truck Body'))
  } else if (isTrailer) {
    specRows.push(...buildTrailerRows(cfg, 'trl'))
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', 'Helvetica Neue', sans-serif; background: #fff; color: #1a1a1a; font-size: 10pt; }

        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 16mm; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .header-left .title { font-size: 24pt; font-weight: 900; color: #1a1a1a; letter-spacing: 2px; text-transform: uppercase; }
        .header-left .subtitle { font-size: 9pt; color: #666; margin-top: 2px; }
        .header-right { text-align: right; }
        .header-right .ylz { font-size: 18pt; font-weight: 900; color: #E8681A; }
        .header-right .sub { font-size: 8pt; color: #888; margin-top: 2px; }
        .divider { height: 3px; background: #E8681A; margin-bottom: 14px; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-cell { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
        .info-cell .lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #999; margin-bottom: 3px; }
        .info-cell .val { font-size: 11pt; font-weight: 700; color: #1a1a1a; }
        .info-cell .val2 { font-size: 9pt; color: #555; margin-top: 1px; }
        .info-cell .blank-line { border-bottom: 2px solid #1a1a1a; height: 24px; margin-top: 4px; }
        .job-num-filled { font-size: 13pt; font-weight: 900; color: #E8681A; }

        .spec-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .spec-table .spec-label { width: 200px; font-size: 9pt; color: #555; font-weight: 600; padding: 5px 10px 5px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        .spec-table .spec-value { font-size: 10pt; color: #1a1a1a; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
        .spec-table .spec-section { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #fff; background: #E8681A; padding: 4px 10px; }
        .spec-table tr:last-child td { border-bottom: none; }

        .signoff { margin-top: 14px; }
        .signoff-title { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; border-bottom: 1px solid rgba(232,104,26,0.3); padding-bottom: 4px; margin-bottom: 10px; }
        .signoff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .signoff-cell { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; }
        .signoff-cell .stage { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 10px; }
        .signoff-cell .line { border-bottom: 1px solid #ccc; margin-bottom: 8px; height: 22px; }
        .signoff-cell .sub { font-size: 7.5pt; color: #bbb; }

        .notes-box { border: 1px solid #ddd; border-radius: 4px; padding: 10px 12px; margin-bottom: 10px; min-height: 40px; }
        .notes-box.highlight { border-color: #E8681A; background: #fff8f4; }
        .notes-title { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; margin-bottom: 6px; }
        .notes-text { font-size: 9.5pt; color: #333; white-space: pre-line; line-height: 1.5; }

        .combo-note { background: #fff3e0; border: 1px solid #E8681A; border-radius: 4px; padding: 8px 12px; font-size: 9pt; color: #555; margin-bottom: 10px; }

        .print-bar { background: #1a1a1a; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .print-bar button { background: #E8681A; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 13px; }
        .print-bar .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; }
        .print-bar a { color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none; }

        @media print {
          .print-bar { display: none !important; }
          .page { padding: 10mm 12mm; }
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* Print bar */}
      <div className="print-bar">
        <a href={`/quotes/builder?id=${params.id}`}>← Back to quote</a>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1, textAlign: 'center' }}>
          Job Sheet — {quote.quoteNumber}{jobNum ? ` / ${jobNum}` : ''} — {quote.customerName}
        </span>
        <button className="btn-ghost" onClick={() => window.open(`/qpdf/${params.id}`, '_blank')}>Quote PDF</button>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <div className="page">

        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="title">Job Sheet</div>
            <div className="subtitle">Workshop Copy — Not for customer distribution</div>
          </div>
          <div className="header-right">
            <div className="ylz">YLZ</div>
            <div className="sub">YLZ Truck Bodies &amp; Trailers</div>
          </div>
        </div>
        <div className="divider" />

        {/* Info row 1: Quote ref | Dealer | Customer | Build type */}
        <div className="info-grid-4">
          <div className="info-cell">
            <div className="lbl">Quote Ref</div>
            <div className="val">{quote.quoteNumber}</div>
            <div className="val2">{fmtDate(quote.createdAt)}</div>
          </div>
          <div className="info-cell">
            <div className="lbl">Dealer</div>
            <div className="val" style={{ fontSize: '10pt' }}>{quote.dealerName || '—'}</div>
          </div>
          <div className="info-cell">
            <div className="lbl">Customer</div>
            <div className="val" style={{ fontSize: '10pt' }}>{quote.customerName}</div>
            {quote.contactName && <div className="val2">{quote.contactName}</div>}
            {quote.contactPhone && <div className="val2">{quote.contactPhone}</div>}
          </div>
          <div className="info-cell">
            <div className="lbl">Build Type</div>
            <div className="val" style={{ fontSize: '10pt' }}>{quote.buildType}</div>
            <div className="val2">Quoted: ${effectiveTotal.toLocaleString('en-AU', { maximumFractionDigits: 0 })} ex GST</div>
          </div>
        </div>

        {/* Info row 2: Job Number | Prepared By | Date Required */}
        <div className="info-grid" style={{ marginBottom: 14 }}>
          <div className="info-cell">
            <div className="lbl">Job Number</div>
            {jobNum ? <div className="job-num-filled">{jobNum}</div> : <div className="blank-line" />}
          </div>
          <div className="info-cell">
            <div className="lbl">Prepared By</div>
            <div className="val" style={{ fontSize: '10pt' }}>{quote.preparedBy || '—'}</div>
          </div>
          <div className="info-cell">
            <div className="lbl">Date Required</div>
            <div className="blank-line" />
          </div>
        </div>

        {/* Combo note */}
        {isCombo && (
          <div className="combo-note">
            ⚠️ <strong>Truck + Trailer combo</strong> — this job sheet covers both units. Issue separate job numbers for truck body and trailer if required.
          </div>
        )}

        {/* Special requirements */}
        {specialReqs && (
          <div className="notes-box highlight">
            <div className="notes-title">⚠ Customer Requirements / Special Notes</div>
            <div className="notes-text">{specialReqs}</div>
          </div>
        )}

        {/* Build Specification */}
        <table className="spec-table">
          <tbody>
            {specRows}
          </tbody>
        </table>

        {/* Internal notes */}
        {quote.notes && (
          <div className="notes-box">
            <div className="notes-title">Internal Notes</div>
            <div className="notes-text">{quote.notes}</div>
          </div>
        )}

        {/* Sign-off */}
        <div className="signoff">
          <div className="signoff-title">Workshop Sign-Off</div>
          <div className="signoff-grid">
            {['Sub-frame & Hoist Mount', 'Body Fabrication', 'Hydraulics & Coupling', 'Tarp & Electrical', 'Paint', 'QA Sign-off'].map((stage) => (
              <div key={stage} className="signoff-cell">
                <div className="stage">{stage}</div>
                <div className="line" />
                <div className="sub">Signed: ___________</div>
                <div style={{ height: 14 }} />
                <div className="sub">Date: _____________</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
