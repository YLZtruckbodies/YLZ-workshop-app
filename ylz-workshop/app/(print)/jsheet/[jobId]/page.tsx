'use client'

import { useEffect, useState } from 'react'

interface Job {
  id: string
  num: string
  type: string
  customer: string
  dealer: string
  due: string
  btype: string
  dims: string
  notes: string
  make: string
  po: string
  vin: string
  createdAt: string
}

function today() {
  return new Date().toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const S = {
  page: `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1a1a1a; font-size: 10pt; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 12mm 16mm; page-break-after: always; }
    .sheet:last-child { page-break-after: avoid; }

    /* Header */
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .hdr-title { font-size: 22pt; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #1a1a1a; }
    .hdr-sub { font-size: 8.5pt; color: #666; margin-top: 3px; }
    .hdr-ylz { font-size: 16pt; font-weight: 900; color: #E8681A; text-align: right; }
    .hdr-ylzsub { font-size: 8pt; color: #888; margin-top: 2px; text-align: right; }
    .divider { height: 3px; background: #E8681A; margin-bottom: 12px; }

    /* Info cells */
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

    /* Sections */
    .section { margin-bottom: 10px; }
    .section-hdr { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
      color: #fff; background: #E8681A; padding: 4px 10px; margin-bottom: 0; }
    .section-body { border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; }

    /* Field rows */
    .field-row { display: grid; border-bottom: 1px solid #f0f0f0; }
    .field-row:last-child { border-bottom: none; }
    .field-row-2 { grid-template-columns: 1fr 1fr; }
    .field-row-3 { grid-template-columns: 1fr 1fr 1fr; }
    .field-row-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .field { padding: 6px 10px; border-right: 1px solid #f0f0f0; }
    .field:last-child { border-right: none; }
    .field-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #999; margin-bottom: 3px; }
    .field-val { font-size: 9.5pt; color: #1a1a1a; font-weight: 600; }
    .field-blank { border-bottom: 1.5px solid #1a1a1a; height: 20px; margin-top: 3px; }

    /* Checklist */
    .check-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #ddd; border-radius: 0 0 4px 4px; }
    .check-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; border-right: 1px solid #f0f0f0; font-size: 9pt; }
    .check-item:nth-child(4n) { border-right: none; }
    .check-box { width: 12px; height: 12px; border: 1.5px solid #999; border-radius: 2px; flex-shrink: 0; }

    /* Notes */
    .notes-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; min-height: 50px; margin-bottom: 10px; }
    .notes-lbl { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; margin-bottom: 5px; }
    .notes-lines { display: flex; flex-direction: column; gap: 8px; }
    .notes-line { border-bottom: 1px solid #ddd; height: 18px; }
    .notes-text { font-size: 9.5pt; color: #333; white-space: pre-line; line-height: 1.5; }

    /* Signoff */
    .signoff-hdr { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #E8681A; border-bottom: 1px solid rgba(232,104,26,0.3); padding-bottom: 4px; margin-bottom: 8px; }
    .signoff-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .signoff-cell { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
    .signoff-stage { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .sig-line { border-bottom: 1px solid #ccc; height: 20px; margin-bottom: 6px; }
    .sig-lbl { font-size: 7.5pt; color: #bbb; }

    /* Print bar */
    .print-bar { background: #1a1a1a; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; z-index: 100; }
    .print-bar button { background: #E8681A; color: #fff; border: none; padding: 8px 20px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 13px; }
    .print-bar a { color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: none; }
    .print-bar .sheet-tabs { display: flex; gap: 8px; }
    .print-bar .tab { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); cursor: pointer; background: transparent; }
    .print-bar .tab.active { background: #E8681A; border-color: #E8681A; color: #fff; }

    @media print {
      .print-bar { display: none !important; }
      .sheet { padding: 10mm 12mm; }
      @page { size: A4; margin: 0; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `
}

export default function JobSheetPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/jobs/${params.jobId}`)
      .then(r => r.json())
      .then(d => { setJob(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.jobId])

  if (loading) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#666' }}>Loading…</div>
  if (!job) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#c00' }}>Job not found</div>

  const isTrailer = job.btype === 'ally-trailer' || job.btype === 'hardox-trailer'
  const bodyLabel = isTrailer ? 'Trailer Body' : 'Truck Body'

  return (
    <>
      <style>{S.page}</style>

      {/* Print bar */}
      <div className="print-bar">
        <a href={`/jobboard`}>← Job Board</a>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{job.num} — {job.customer} — Job Sheets</span>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      {/* ═══════════════════════════════════════════
          SHEET 1 — BODY FABRICATION
      ═══════════════════════════════════════════ */}
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

        {/* Job info */}
        <div className="info-row info-row-4">
          <div className="cell">
            <div className="cell-lbl">Job Number</div>
            <div className="cell-val-num">{job.num}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Customer</div>
            <div className="cell-val-sm">{job.customer || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Dealer</div>
            <div className="cell-val-sm">{job.dealer || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Date Issued</div>
            <div className="cell-val-sm">{today()}</div>
          </div>
        </div>
        <div className="info-row info-row-4" style={{ marginBottom: 12 }}>
          <div className="cell">
            <div className="cell-lbl">Build Type</div>
            <div className="cell-val-sm">{job.type || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Chassis / Make</div>
            <div className="cell-blank" />
          </div>
          <div className="cell">
            <div className="cell-lbl">Due Date</div>
            <div className="cell-val-sm">{job.due || ''}</div>
            {!job.due && <div className="cell-blank" />}
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
              <div className="field"><div className="field-lbl">Serial No.</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Truck VIN</div><div className="field-val">{job.vin || ''}</div>{!job.vin && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Sales Drawing No.</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="section">
          <div className="section-hdr">Body Dimensions</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Body Length (mm)</div><div className="field-val">{job.dims?.split('x')[0]?.trim() || ''}</div>{!job.dims && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Width (mm)</div><div className="field-val">{job.dims?.split('x')[1]?.trim() || ''}</div>{!job.dims?.split('x')[1] && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Height (mm)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Capacity (m³)</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Main Runner Width</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Hoist Box Height</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Floor Sheet</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Side Sheet</div><div className="field-blank" /></div>
            </div>
            {isTrailer && (
              <div className="field-row field-row-4">
                <div className="field"><div className="field-lbl">Chassis Length (mm)</div><div className="field-blank" /></div>
                <div className="field"><div className="field-lbl">Chassis Width (mm)</div><div className="field-blank" /></div>
                <div className="field"><div className="field-lbl">Wheelbase (mm)</div><div className="field-blank" /></div>
                <div className="field"><div className="field-lbl">Drawbar Length (mm)</div><div className="field-blank" /></div>
              </div>
            )}
          </div>
        </div>

        {/* Hoist */}
        <div className="section">
          <div className="section-hdr">Hoist &amp; Controls</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Hoist Model</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">PTO</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Hoist Controls</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Valve Bank</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Pump Type</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">C/L Pivot to Rear (mm)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Tailgate Type</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Tailgate Lights</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Hydraulics */}
        <div className="section">
          <div className="section-hdr">Hydraulics</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Hydraulic System</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Tank Type</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Tank Location</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Tarp */}
        <div className="section">
          <div className="section-hdr">Tarp System</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Tarp Make / Model</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Operation</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Colour</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Coupling */}
        <div className="section">
          <div className="section-hdr">Coupling</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Coupling Type</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Coupling Height (mm)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">D-Value (kN)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Pintle Eye Height</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="notes-box">
          <div className="notes-lbl">Special Instructions / Notes</div>
          {job.notes ? (
            <div className="notes-text">{job.notes}</div>
          ) : (
            <div className="notes-lines">
              <div className="notes-line" />
              <div className="notes-line" />
              <div className="notes-line" />
            </div>
          )}
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

      {/* ═══════════════════════════════════════════
          SHEET 2 — FITOUT
      ═══════════════════════════════════════════ */}
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
          <div className="cell">
            <div className="cell-lbl">Job Number</div>
            <div className="cell-val-num">{job.num}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Customer</div>
            <div className="cell-val-sm">{job.customer || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Build Type</div>
            <div className="cell-val-sm">{job.type || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Date</div>
            <div className="cell-val-sm">{today()}</div>
          </div>
        </div>

        {/* Truck accessories */}
        {!isTrailer && (
          <div className="section">
            <div className="section-hdr">Truck Body Accessories</div>
            <div className="check-grid">
              {['Rope Rails', 'Toolbox LHS', 'Toolbox RHS', 'Underbody Toolbox', 'Water Cooler Holder', 'Ladder', 'Tow Hitch', 'Headboard', 'Cab Guard', 'Load Pegs', 'Grain Sides', 'Mesh Extensions', 'Drop Sides', 'Side Pegs', 'Rear Bumper', 'Mudflaps'].map(item => (
                <div key={item} className="check-item">
                  <div className="check-box" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trailer accessories */}
        {isTrailer && (
          <div className="section">
            <div className="section-hdr">Trailer Accessories</div>
            <div className="check-grid">
              {['Mudguards', 'Spray Suppression', 'Side Markers', 'Reflectors', 'Air Reservoir', 'Water Tank', 'Fuel Tank', 'Air Dryer', 'Belly Plates', 'Chassis Toolbox', 'Jockey Wheel', 'Safety Chains', 'EBS File', 'VIN Plate', 'Axle Suspension Order', 'Lights & Wiring'].map(item => (
                <div key={item} className="check-item">
                  <div className="check-box" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fitout details */}
        <div className="section" style={{ marginTop: 10 }}>
          <div className="section-hdr">Fitout Details</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Subframe Length (mm)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Subframe Width (mm)</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Toolbox Size</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Suspension</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Axle Make / Count</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Brake Type</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="notes-box" style={{ marginTop: 10 }}>
          <div className="notes-lbl">Special Instructions / Notes</div>
          <div className="notes-lines">
            <div className="notes-line" />
            <div className="notes-line" />
            <div className="notes-line" />
            <div className="notes-line" />
          </div>
        </div>

        {/* Sign-off */}
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

      {/* ═══════════════════════════════════════════
          SHEET 3 — PAINT
      ═══════════════════════════════════════════ */}
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
          <div className="cell">
            <div className="cell-lbl">Job Number</div>
            <div className="cell-val-num">{job.num}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Customer</div>
            <div className="cell-val-sm">{job.customer || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Build Type</div>
            <div className="cell-val-sm">{job.type || '—'}</div>
          </div>
          <div className="cell">
            <div className="cell-lbl">Date</div>
            <div className="cell-val-sm">{today()}</div>
          </div>
        </div>

        {/* Paint spec */}
        <div className="section">
          <div className="section-hdr">Paint Specification</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Paint Colour</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Paint Code</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Paint Brand</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Finish</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Primer</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Coats</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Paint areas */}
        <div className="section">
          <div className="section-hdr">Areas to Paint</div>
          <div className="check-grid">
            {['Body — Inside', 'Body — Outside', 'Headboard', 'Tailgate', 'Subframe', 'Mudguards / Mudflaps', 'Toolboxes', 'Cab Guard', 'Chassis (Trailer)', 'Drawbar', 'Running Gear', 'Underbody'].map(item => (
              <div key={item} className="check-item">
                <div className="check-box" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Special paint notes */}
        <div className="notes-box" style={{ marginTop: 10 }}>
          <div className="notes-lbl">Special Instructions / Masking Notes</div>
          <div className="notes-lines">
            <div className="notes-line" />
            <div className="notes-line" />
            <div className="notes-line" />
            <div className="notes-line" />
          </div>
        </div>

        {/* Sign-off */}
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
