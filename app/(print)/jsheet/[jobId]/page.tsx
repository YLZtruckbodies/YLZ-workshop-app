'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { generateTEBSDocx, downloadTEBSBlob, hasTEBSData, type TEBSInput } from '@/lib/tebs'

interface BomEntry {
  code: string
  name: string
  category: string
  section: string
  auto: boolean
  note?: string
}

interface QuoteConfig {
  material?: string
  chassisMake?: string
  chassisModel?: string
  bodyLength?: string
  bodyHeight?: string
  bodyWidth?: string
  bodyCapacity?: string
  hoist?: string
  coupling?: string
  pto?: string
  controls?: string
  hydraulics?: string
  tarpSystem?: string
  floorSheet?: string
  sideSheet?: string
  serial?: string
  vin?: string
  paintColour?: string
  axleCount?: number
  axleMake?: string
  axleType?: string
  suspension?: string
  trailerModel?: string
  trailerType?: string
  pbsRating?: string
  chassisLength?: string
  drawbarLength?: string
  wheelbase?: string
  mainRunnerWidth?: string
  tailgateLights?: string
  tailLights?: string
  lockFlap?: string
  specialRequirements?: string
  hydTankType?: string
  hydTankLocation?: string
  tailgateType?: string
  brakeCoupling?: string
  [key: string]: unknown
}

function deriveCouplingLoad(coupling: string): string {
  if (!coupling || coupling === 'None') return ''
  const c = coupling.toLowerCase()
  if (c.includes('pintle')) return '8.1T'
  if (c.includes('orlandi') || c.includes('bartlett') || c.includes('ringfeder')) return '2.5T'
  return ''
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
  bomList?: BomEntry[]
  createdAt: string
  // Quote config — populated from linked quote
  cfg?: QuoteConfig
  quoteNumber?: string
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
    .field-row-5 { grid-template-columns: 1fr 1fr 1fr 1fr 1fr; }
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
      .edit-panel { display: none !important; }
      .sheet { padding: 10mm 12mm; }
      @page { size: A4; margin: 0; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `
}

export default function JobSheetPage({ params }: { params: { jobId: string } }) {
  const searchParams = useSearchParams()
  const editMode = searchParams.get('edit') === 'true'
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [tebsLoading, setTebsLoading] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Editable fields — job-level
  const [editMake, setEditMake] = useState('')
  const [editVin, setEditVin] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDims, setEditDims] = useState('')
  const [editPo, setEditPo] = useState('')

  // Editable fields — quote config
  const [editCfg, setEditCfg] = useState<Record<string, string>>({})

  const setCfgField = (key: string, val: string) => setEditCfg(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    fetch(`/api/jobs/${params.jobId}`)
      .then(r => r.json())
      .then(async (jobData) => {
        // Try to fetch linked quote for configuration data
        try {
          const qRes = await fetch(`/api/quotes?jobId=${jobData.id}`)
          const quotes = await qRes.json()
          const quote = Array.isArray(quotes) ? quotes.find((q: any) => q.jobId === jobData.id) : null
          if (quote) {
            setQuoteId(quote.id)
            // Fetch full quote with configuration
            const fullRes = await fetch(`/api/quotes/${quote.id}`)
            const fullQuote = await fullRes.json()
            if (fullQuote.configuration) {
              jobData.cfg = fullQuote.configuration as QuoteConfig
              jobData.quoteNumber = fullQuote.quoteNumber
              // Backfill job fields from config if missing
              if (!jobData.vin && jobData.cfg?.vin) jobData.vin = jobData.cfg.vin
              if (!jobData.make && jobData.cfg?.chassisMake) {
                jobData.make = `${jobData.cfg.chassisMake} ${jobData.cfg.chassisModel || ''}${jobData.cfg.chassisVariant ? ` (${jobData.cfg.chassisVariant})` : ''}`.trim()
              }
            }
            // Always use quote customer name and dealer if available
            if (fullQuote.customerName) jobData.customer = fullQuote.customerName
            if (fullQuote.dealerName) jobData.dealer = fullQuote.dealerName
          }
        } catch { /* quote fetch failed — continue with job data only */ }

        // Auto-refresh BOM if any tarp entry is missing a length note (legacy jobs)
        const boms: BomEntry[] = Array.isArray(jobData.bomList) ? jobData.bomList : []
        const needsRefresh = boms.some(b => b.section?.toLowerCase().includes('tarp') && !b.note)
        if (needsRefresh && jobData.id) {
          try {
            const refreshRes = await fetch(`/api/jobs/${jobData.id}/boms`, { method: 'POST' })
            if (refreshRes.ok) {
              const refreshed = await fetch(`/api/jobs/${params.jobId}`).then(r => r.json())
              jobData.bomList = refreshed.bomList
            }
          } catch { /* ignore refresh failure */ }
        }

        setJob(jobData)
        // Initialise edit fields
        setEditMake(jobData.make || '')
        setEditVin(jobData.vin || '')
        setEditNotes(jobData.notes || '')
        setEditDims(jobData.dims || '')
        setEditPo(jobData.po || '')
        if (jobData.cfg) {
          const cfgInit: Record<string, string> = {}
          for (const [k, v] of Object.entries(jobData.cfg)) {
            cfgInit[k] = v != null ? String(v) : ''
          }
          setEditCfg(cfgInit)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.jobId])

  const handleSave = async () => {
    if (!job) return
    setSaving(true)
    setSaveMsg('')
    try {
      // Save job-level fields
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: editMake,
          vin: editVin,
          notes: editNotes,
          dims: editDims,
          po: editPo,
          _userName: 'Engineering',
        }),
      })
      // Save quote config if quote exists
      if (quoteId) {
        await fetch(`/api/quotes/${quoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configuration: editCfg }),
        })
      }
      // Reload data
      const res = await fetch(`/api/jobs/${job.id}`)
      const updated = await res.json()
      if (quoteId) {
        const qRes = await fetch(`/api/quotes/${quoteId}`)
        const fullQuote = await qRes.json()
        if (fullQuote.configuration) {
          updated.cfg = fullQuote.configuration
          updated.quoteNumber = fullQuote.quoteNumber
        }
      }
      setJob(updated)
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('Save failed')
    }
    setSaving(false)
  }

  if (loading) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#666' }}>Loading…</div>
  if (!job) return <div style={{ fontFamily: 'sans-serif', padding: 40, color: '#c00' }}>Job not found</div>

  const isTrailer = job.btype === 'ally-trailer' || job.btype === 'hardox-trailer'
    || job.type?.toLowerCase().includes('trailer') || job.type?.toLowerCase().includes('dog')
    || job.type?.toLowerCase().includes('semi')
  const bodyLabel = isTrailer ? 'Trailer Body' : 'Truck Body'

  // Helper to get a value from quote config, with fallback.
  // For truck-and-trailer builds, truck fields are nested under cfg.truckConfig.
  const c = (key: string) => {
    const val = job.cfg?.[key]
    if (val != null && val !== '') return String(val)
    // Fall back to truckConfig for truck-and-trailer builds
    const truckVal = (job.cfg?.truckConfig as any)?.[key]
    if (truckVal != null && truckVal !== '') return String(truckVal)
    // valveBankType maps to the 'hydraulics' field saved by the quote builder
    if (key === 'valveBankType') {
      const hyd = job.cfg?.hydraulics || (job.cfg?.truckConfig as any)?.hydraulics
      if (hyd == null || hyd === '') return ''
      const hydStr = String(hyd)
      const mat = job.cfg?.material || (job.cfg?.truckConfig as any)?.material || ''
      const twinPn = String(mat).toLowerCase().includes('aluminium') ? '121.15.104' : '121.15.113'
      if (hydStr === 'Single spool valve') return 'Single spool valve — 121.8.185'
      if (hydStr === 'Truck and Trailer spool valve') return `Truck and Trailer spool valve — ${twinPn}`
      return hydStr
    }
    return ''
  }

  // TEBS datasheet — only for trailers with axle config
  const tebsInput: TEBSInput | null = isTrailer && job.cfg?.axleCount && job.cfg?.axleMake && job.cfg?.axleType
    ? { axleCount: job.cfg.axleCount, axleMake: job.cfg.axleMake, axleType: job.cfg.axleType, vin: job.vin || job.cfg?.vin || '', jobNumber: job.num }
    : null
  const canDownloadTEBS = tebsInput && hasTEBSData(tebsInput)

  const handleTEBSDownload = async () => {
    if (!tebsInput) return
    setTebsLoading(true)
    try {
      const blob = await generateTEBSDocx(tebsInput)
      if (blob) downloadTEBSBlob(blob, job.num)
    } catch { /* ignore */ }
    setTebsLoading(false)
  }

  return (
    <>
      <style>{S.page}</style>

      {/* Print bar */}
      <div className="print-bar">
        <a href={`/jobboard`}>← Job Board</a>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{job.num} — {job.customer} — Job Sheets</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {canDownloadTEBS && (
            <button onClick={handleTEBSDownload} disabled={tebsLoading} style={{ opacity: tebsLoading ? 0.5 : 1 }}>
              {tebsLoading ? 'Generating...' : '📄 TEBS Datasheet'}
            </button>
          )}
          <button onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      {/* ═══ EDIT MODE PANEL ═══ */}
      {editMode && job && (
        <div className="edit-panel" style={{
          background: '#111', borderBottom: '2px solid #E8681A', padding: '24px 32px',
          fontFamily: "'League Spartan', Arial, sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#E8681A', letterSpacing: 2, textTransform: 'uppercase' }}>
              Edit Job Sheet — {job.num}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {saveMsg && <span style={{ fontSize: 13, fontWeight: 600, color: saveMsg === 'Saved' ? '#22d07a' : '#e84560' }}>{saveMsg}</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#E8681A', color: '#fff', border: 'none', padding: '10px 28px',
                  borderRadius: 4, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  opacity: saving ? 0.5 : 1, letterSpacing: 0.5,
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {(() => {
            const lblStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#999', marginBottom: 4 }
            const inpStyle: React.CSSProperties = {
              width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4,
              padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'Arial, sans-serif',
            }
            const sectionLbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#E8681A', marginBottom: 10, marginTop: 16 }

            const cfgField = (label: string, key: string) => (
              <div key={key}>
                <div style={lblStyle}>{label}</div>
                <input style={inpStyle} value={editCfg[key] || ''} onChange={e => setCfgField(key, e.target.value)} />
              </div>
            )

            return (
              <>
                {/* Job-level fields */}
                <div style={sectionLbl}>Job Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 8 }}>
                  <div>
                    <div style={lblStyle}>Chassis / Make & Model</div>
                    <input style={inpStyle} value={editMake} onChange={e => setEditMake(e.target.value)} placeholder="e.g. UD Trucks Quon CW26 420" />
                  </div>
                  <div>
                    <div style={lblStyle}>Variant</div>
                    <input style={inpStyle} value={editCfg['chassisVariant'] || ''} onChange={e => setCfgField('chassisVariant', e.target.value)} placeholder="e.g. SAR, 6x4" />
                  </div>
                  <div>
                    <div style={lblStyle}>VIN</div>
                    <input style={inpStyle} value={editVin} onChange={e => setEditVin(e.target.value)} />
                  </div>
                  <div>
                    <div style={lblStyle}>Dimensions</div>
                    <input style={inpStyle} value={editDims} onChange={e => setEditDims(e.target.value)} placeholder="e.g. 5400 x 2500 x 600" />
                  </div>
                  <div>
                    <div style={lblStyle}>Purchase Order</div>
                    <input style={inpStyle} value={editPo} onChange={e => setEditPo(e.target.value)} />
                  </div>
                </div>

                {/* Quote config fields */}
                <div style={sectionLbl}>Body Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Body Length (mm)', 'bodyLength')}
                  {cfgField('Body Width (mm)', 'bodyWidth')}
                  {cfgField('Body Height (mm)', 'bodyHeight')}
                  {cfgField('Capacity (m³)', 'bodyCapacity')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Material', 'material')}
                  {cfgField('Floor Sheet', 'floorSheet')}
                  {cfgField('Side Sheet', 'sideSheet')}
                  {cfgField('Main Runner Width', 'mainRunnerWidth')}
                </div>

                <div style={sectionLbl}>Hoist & Controls</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Hoist Model', 'hoist')}
                  <div key="pivotCentre">
                    <div style={lblStyle}>C/L Pivot to Rear (mm)</div>
                    <input style={inpStyle} value={editCfg['pivotCentre'] || '235'} onChange={e => setCfgField('pivotCentre', e.target.value)} />
                  </div>
                  {cfgField('Hoist Controls', 'controls')}
                  {cfgField('Pump Type', 'pump')}
                  {cfgField('Hose Burst Valve', 'hoseBurstValve')}
                </div>

                <div style={sectionLbl}>Valve Bank</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Valve Bank Type', 'valveBankType')}
                  {cfgField('Valve Bank Notes', 'valveBankNotes')}
                </div>

                <div style={sectionLbl}>PTO Switch Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('PTO Type / Model', 'pto')}
                  {cfgField('Switch Type', 'ptoSwitchType')}
                  {cfgField('Switch Location', 'ptoSwitchLocation')}
                </div>

                <div style={sectionLbl}>Tailgate & Lock Flap</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Tailgate Type', 'tailgateType')}
                  {cfgField('Lock Flap', 'lockFlap')}
                </div>

                <div style={sectionLbl}>Lights & Mudflaps</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Tail Lights', 'tailLights')}
                  {cfgField('Tailgate Lights', 'tailgateLights')}
                  {cfgField('Side Lights', 'sideLights')}
                  {cfgField('Anti-Spray', 'antiSpray')}
                  {cfgField('Mudflaps', 'mudflaps')}
                </div>

                <div style={sectionLbl}>Hydraulics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Hydraulic System', 'hydraulics')}
                  {cfgField('Hydraulic Tank Type', 'hydTankType')}
                  {cfgField('Hydraulic Tank Location', 'hydTankLocation')}
                </div>

                <div style={sectionLbl}>Tarp & Paint</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Tarp System', 'tarpSystem')}
                  {cfgField('Tarp Colour', 'tarpColour')}
                  {cfgField('Paint Colour', 'paintColour')}
                  {cfgField('Coupling', 'coupling')}
                  {cfgField('D-Value (kN)', 'dValue')}
                  <div key="couplingLoad">
                    <div style={lblStyle}>Coupling Vertical Load</div>
                    <input style={inpStyle} value={editCfg['couplingLoad'] || deriveCouplingLoad(String(editCfg['coupling'] || ''))} onChange={e => setCfgField('couplingLoad', e.target.value)} />
                  </div>
                </div>

                <div style={sectionLbl}>Body Extras</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Ladder Type', 'ladderType')}
                  {cfgField('Ladder Position', 'ladderPosition')}
                  {cfgField('Brake Coupling', 'brakeCoupling')}
                  {cfgField('Spreader Chain', 'spreaderChain')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Shovel Holder', 'shovelHolder')}
                  {cfgField('Push Lugs', 'pushLugs')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Rear CAT Markers', 'catMarkers')}
                  {cfgField('Reflectors', 'reflectors')}
                  {cfgField('Camera', 'camera')}
                  {cfgField('Vibrator', 'vibrator')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Grain Doors', 'grainDoors')}
                  {cfgField('Grain Locks', 'grainLocks')}
                  {cfgField('Reverse Buzzer / Squawker', 'reverseBuzzer')}
                </div>

                <div style={sectionLbl}>Rear Signage</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Signage Type', 'rearSignageType')}
                  {cfgField('Notes', 'rearSignageNotes')}
                </div>

                <div style={sectionLbl}>Reverse Buzzer / Squawker</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 8 }}>
                  <div key="reverseBuzzerType">
                    <div style={lblStyle}>Type</div>
                    <input style={inpStyle} value={editCfg['reverseBuzzerType'] || editCfg['reverseBuzzer'] || ''} onChange={e => setCfgField('reverseBuzzerType', e.target.value)} />
                  </div>
                  {cfgField('Location', 'reverseBuzzerLocation')}
                </div>

                {(editCfg['material'] || '').toLowerCase().includes('aluminium') && (<>
                  <div style={sectionLbl}>Body Spigot / Rock Sheet / Liner</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
                    {cfgField('Body Spigot', 'bodySpigot')}
                    {cfgField('Rock Sheet', 'rockSheet')}
                    {cfgField('Liner', 'liner')}
                  </div>
                </>)}

                <div style={sectionLbl}>Trailer / Chassis (if applicable)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Chassis Length (mm)', 'chassisLength')}
                  {cfgField('Wheelbase (mm)', 'wheelbase')}
                  {cfgField('Drawbar Length (mm)', 'drawbarLength')}
                  {cfgField('Suspension', 'suspension')}
                  {cfgField('Chassis Extension', 'chassisExtension')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                  {cfgField('Axle Make', 'axleMake')}
                  {cfgField('Axle Type', 'axleType')}
                  {cfgField('Axle Count', 'axleCount')}
                  {cfgField('PBS Rating', 'pbsRating')}
                </div>

                {/* Notes */}
                <div style={sectionLbl}>Notes / Special Requirements</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={lblStyle}>Job Notes</div>
                    <textarea style={{ ...inpStyle, minHeight: 70, resize: 'vertical' }} value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                  </div>
                  <div>
                    <div style={lblStyle}>Special Requirements (Quote)</div>
                    <textarea style={{ ...inpStyle, minHeight: 70, resize: 'vertical' }} value={editCfg['specialRequirements'] || ''} onChange={e => setCfgField('specialRequirements', e.target.value)} />
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

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
            <div className="cell-val-sm">{job.make || `${c('chassisMake')} ${c('chassisModel')}${c('chassisVariant') ? ` (${c('chassisVariant')})` : ''}`.trim() || ''}</div>
            {!job.make && !c('chassisMake') && <div className="cell-blank" />}
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
              <div className="field"><div className="field-lbl">Serial No.</div><div className="field-val">{c('serial') || ''}</div>{!c('serial') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">VIN</div><div className="field-val">{job.vin || c('vin') || ''}</div>{!job.vin && !c('vin') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Quote Ref</div><div className="field-val">{job.quoteNumber || ''}</div>{!job.quoteNumber && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Body Details */}
        <div className="section">
          <div className="section-hdr">Body Details</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Body Length (mm)</div><div className="field-val">{c('bodyLength') || job.dims?.split('x')[0]?.trim() || ''}</div>{!c('bodyLength') && !job.dims && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Width (mm)</div><div className="field-val">{c('bodyWidth') || job.dims?.split('x')[1]?.trim() || ''}</div>{!c('bodyWidth') && !job.dims?.split('x')[1] && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Body Height (mm)</div><div className="field-val">{c('bodyHeight') || ''}</div>{!c('bodyHeight') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Capacity (m³)</div><div className="field-val">{c('bodyCapacity') || ''}</div>{!c('bodyCapacity') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Material</div><div className="field-val">{c('material') || ''}</div>{!c('material') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Main Runner Width</div><div className="field-val">{c('mainRunnerWidth') || ''}</div>{!c('mainRunnerWidth') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Floor Sheet</div><div className="field-val">{c('floorSheet') || ''}</div>{!c('floorSheet') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Side Sheet</div><div className="field-val">{c('sideSheet') || ''}</div>{!c('sideSheet') && <div className="field-blank" />}</div>
            </div>
            {isTrailer && (
              <div className="field-row field-row-4">
                <div className="field"><div className="field-lbl">Chassis Length (mm)</div><div className="field-val">{c('chassisLength') || ''}</div>{!c('chassisLength') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Axle Make / Type</div><div className="field-val">{`${c('axleMake')} ${c('axleType')}`.trim() || ''}</div>{!c('axleMake') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Wheelbase (mm)</div><div className="field-val">{c('wheelbase') || ''}</div>{!c('wheelbase') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Drawbar Length (mm)</div><div className="field-val">{c('drawbarLength') || ''}</div>{!c('drawbarLength') && <div className="field-blank" />}</div>
              </div>
            )}
            {!isTrailer && (
              <div className="field-row field-row-2">
                <div className="field"><div className="field-lbl">Chassis Extension</div><div className="field-val">{c('chassisExtension') || ''}</div>{!c('chassisExtension') && <div className="field-blank" />}</div>
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
              <div className="field"><div className="field-lbl">Hoist Model</div><div className="field-val">{c('hoist') || ''}</div>{!c('hoist') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">C/L Pivot to Rear (mm)</div><div className="field-val">{c('pivotCentre') || '235'}</div></div>
              <div className="field"><div className="field-lbl">Hoist Controls</div><div className="field-val">{c('controls') || ''}</div>{!c('controls') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Pump Type</div><div className="field-val">{c('pump') || c('pumpType') || ''}</div>{!(c('pump') || c('pumpType')) && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Hose Burst Valve</div><div className="field-val">{c('hoseBurstValve') || ''}</div>{!c('hoseBurstValve') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Valve Bank */}
        <div className="section">
          <div className="section-hdr">Valve Bank</div>
          <div className="section-body">
            <div className="field-row field-row-2">
              <div className="field"><div className="field-lbl">Valve Bank Type</div><div className="field-val">{c('valveBankType') || ''}</div>{!c('valveBankType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Notes</div><div className="field-val">{c('valveBankNotes') || ''}</div>{!c('valveBankNotes') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* PTO Switch Type */}
        <div className="section">
          <div className="section-hdr">PTO Switch Type</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">PTO Type / Model</div><div className="field-val">{c('pto') || ''}</div>{!c('pto') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Switch Type</div><div className="field-val">{c('ptoSwitchType') || c('controls') || ''}</div>{!c('ptoSwitchType') && !c('controls') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Switch Location</div><div className="field-val">{c('ptoSwitchLocation') || ''}</div>{!c('ptoSwitchLocation') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">PTO Notes</div><div className="field-blank" /></div>
            </div>
          </div>
        </div>

        {/* Tailgate & Lock Flap */}
        <div className="section">
          <div className="section-hdr">Tailgate &amp; Lock Flap</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Tailgate Type</div><div className="field-val">{c('tailgateType') || ''}</div>{!c('tailgateType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Lock Flap</div><div className="field-val">{c('lockFlap') || c('controls') || ''}</div>{!c('lockFlap') && !c('controls') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tailgate Controls</div><div className="field-val">{c('controls') || ''}</div>{!c('controls') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Lights & Mudflaps */}
        <div className="section">
          <div className="section-hdr">Lights &amp; Mudflaps</div>
          <div className="section-body">
            <div className="field-row field-row-5">
              <div className="field"><div className="field-lbl">Tail Lights</div><div className="field-val">{c('tailLights') || ''}</div>{!c('tailLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tailgate Lights</div><div className="field-val">{c('tailgateLights') || ''}</div>{!c('tailgateLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Side Lights</div><div className="field-val">{c('sideLights') || ''}</div>{!c('sideLights') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Anti-Spray</div><div className="field-val">{c('antiSpray') || ''}</div>{!c('antiSpray') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Mudflaps</div><div className="field-val">{c('mudflaps') || ''}</div>{!c('mudflaps') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Hydraulics */}
        <div className="section">
          <div className="section-hdr">Hydraulics</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Hydraulic System</div><div className="field-val">{c('valveBankType') || ''}</div>{!c('valveBankType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Hydraulic Tank Type</div><div className="field-val">{c('hydTankType') || ''}</div>{!c('hydTankType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Hydraulic Tank Location</div><div className="field-val">{c('hydTankLocation') || ''}</div>{!c('hydTankLocation') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Tarp */}
        <div className="section">
          <div className="section-hdr">Tarp System</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Tarp Make / Model</div><div className="field-val">{c('tarpSystem') || ''}</div>{!c('tarpSystem') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tarp Length (mm)</div><div className="field-val">{c('tarpLength') || ''}</div>{!c('tarpLength') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Tarp Colour</div><div className="field-val">{c('tarpColour') || ''}</div>{!c('tarpColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Bow Height</div><div className="field-val">{calcBowHeight(c('material') as string, c('bodyHeight') as string) || c('tarpBowSize') as string || ''}</div>{!calcBowHeight(c('material') as string, c('bodyHeight') as string) && !c('tarpBowSize') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Coupling */}
        <div className="section">
          <div className="section-hdr">Coupling</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Coupling Type</div><div className="field-val">{c('coupling') || ''}</div>{!c('coupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling') || ''}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Suspension</div><div className="field-val">{c('suspension') || ''}</div>{!c('suspension') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">PBS Rating</div><div className="field-val">{c('pbsRating') || ''}</div>{!c('pbsRating') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-2">
              <div className="field"><div className="field-lbl">D-Value (kN)</div><div className="field-val">{c('dValue') || ''}</div>{!c('dValue') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Coupling Vertical Load</div><div className="field-val">{c('couplingLoad') || deriveCouplingLoad(String(c('coupling') || ''))}</div>{!(c('couplingLoad') || deriveCouplingLoad(String(c('coupling') || ''))) && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Body Extras */}
        <div className="section">
          <div className="section-hdr">Body Extras</div>
          <div className="section-body">
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Ladder Type</div><div className="field-val">{c('ladderType') || ''}</div>{!c('ladderType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Ladder Position</div><div className="field-val">{c('ladderPosition') || ''}</div>{!c('ladderPosition') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling') || ''}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Spreader Chain</div><div className="field-val">{c('spreaderChain') || ''}</div>{!c('spreaderChain') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-2">
              <div className="field"><div className="field-lbl">Shovel Holder</div><div className="field-val">{c('shovelHolder') || ''}</div>{!c('shovelHolder') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Push Lugs</div><div className="field-val">{c('pushLugs') || ''}</div>{!c('pushLugs') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Rear CAT Markers</div><div className="field-val">{c('catMarkers') || ''}</div>{!c('catMarkers') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Reflectors</div><div className="field-val">{c('reflectors') || ''}</div>{!c('reflectors') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Camera</div><div className="field-val">{c('camera') || ''}</div>{!c('camera') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Vibrator</div><div className="field-val">{c('vibrator') || ''}</div>{!c('vibrator') && <div className="field-blank" />}</div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Grain Doors</div><div className="field-val">{c('grainDoors') || ''}</div>{!c('grainDoors') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Grain Locks</div><div className="field-val">{c('grainLocks') || ''}</div>{!c('grainLocks') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Reverse Buzzer / Squawker</div><div className="field-val">{c('reverseBuzzer') || ''}</div>{!c('reverseBuzzer') && <div className="field-blank" />}</div>
            </div>
          </div>
        </div>

        {/* Body Spigot / Rock Sheet / Liner — Aluminium only */}
        {String(c('material') || '').toLowerCase().includes('aluminium') && (
          <div className="section">
            <div className="section-hdr">Body Spigot / Rock Sheet / Liner</div>
            <div className="section-body">
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Body Spigot</div><div className="field-val">{c('bodySpigot') || ''}</div>{!c('bodySpigot') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Rock Sheet</div><div className="field-val">{c('rockSheet') || ''}</div>{!c('rockSheet') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Liner</div><div className="field-val">{c('liner') || ''}</div>{!c('liner') && <div className="field-blank" />}</div>
              </div>
            </div>
          </div>
        )}

        {/* Rear Signage */}
        <div className="section">
          <div className="section-hdr">Rear Signage</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Signage Type</div><div className="field-val">{c('rearSignageType') || ''}</div>{!c('rearSignageType') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Notes</div><div className="field-val">{c('rearSignageNotes') || ''}</div>{!c('rearSignageNotes') && <div className="field-blank" />}</div>
              <div className="field" />
            </div>
          </div>
        </div>

        {/* Reverse Buzzer / Squawker */}
        <div className="section">
          <div className="section-hdr">Reverse Buzzer / Squawker</div>
          <div className="section-body">
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Buzzer / Squawker Type</div><div className="field-val">{c('reverseBuzzerType') || c('reverseBuzzer') || ''}</div>{!c('reverseBuzzerType') && !c('reverseBuzzer') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Location</div><div className="field-val">{c('reverseBuzzerLocation') || ''}</div>{!c('reverseBuzzerLocation') && <div className="field-blank" />}</div>
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
            {job.notes ? `\n\n${job.notes}` : ''}
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
              <div className="field"><div className="field-lbl">Subframe Length (mm)</div><div className="field-val">Refer to drawing</div></div>
              <div className="field"><div className="field-lbl">Subframe Width (mm)</div><div className="field-val">Refer to drawing</div></div>
              <div className="field"><div className="field-lbl">Toolbox Size</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><div className="field-lbl">Suspension</div><div className="field-val">{c('suspension') || ''}</div>{!c('suspension') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Axle Make / Count</div><div className="field-val">{[c('axleMake'), c('axleCount')].filter(Boolean).join(' / ') || ''}</div>{!c('axleMake') && !c('axleCount') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Brake Type</div><div className="field-val">{c('axleType') || ''}</div>{!c('axleType') && <div className="field-blank" />}</div>
            </div>
            {(c('coupling') || c('brakeCoupling') || c('lockFlap')) && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Coupling</div><div className="field-val">{c('coupling') || ''}</div>{!c('coupling') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Brake Coupling</div><div className="field-val">{c('brakeCoupling') || ''}</div>{!c('brakeCoupling') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Lock Flap</div><div className="field-val">{c('lockFlap') || ''}</div>{!c('lockFlap') && <div className="field-blank" />}</div>
              </div>
            )}
            {(c('hydraulics') || c('hydTankType') || c('hydTankLocation')) && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Hydraulic System</div><div className="field-val">{c('valveBankType') || ''}</div>{!c('valveBankType') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Hydraulic Tank Type</div><div className="field-val">{c('hydTankType') || ''}</div>{!c('hydTankType') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">Hydraulic Tank Location</div><div className="field-val">{c('hydTankLocation') || ''}</div>{!c('hydTankLocation') && <div className="field-blank" />}</div>
              </div>
            )}
            {c('tarpSystem') && (
              <div className="field-row field-row-3">
                <div className="field"><div className="field-lbl">Tarp System</div><div className="field-val">{c('tarpSystem')}</div></div>
                <div className="field"><div className="field-lbl">Hoist Model</div><div className="field-val">{c('hoist') || ''}</div>{!c('hoist') && <div className="field-blank" />}</div>
                <div className="field"><div className="field-lbl">PTO</div><div className="field-val">{c('pto') || ''}</div>{!c('pto') && <div className="field-blank" />}</div>
              </div>
            )}
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
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Paint Colour</div><div className="field-val">{c('paintColour') || ''}</div>{!c('paintColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Paint Spec</div><div className="field-val">{c('paintSpec') || (c('paintColour') ? 'To match cab' : '')}</div>{!c('paintSpec') && !c('paintColour') && <div className="field-blank" />}</div>
              <div className="field"><div className="field-lbl">Paint Code</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Paint Brand</div><div className="field-blank" /></div>
            </div>
            <div className="field-row field-row-4">
              <div className="field"><div className="field-lbl">Finish</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Primer</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Coats</div><div className="field-blank" /></div>
              <div className="field"><div className="field-lbl">Material</div><div className="field-val">{c('material') || ''}</div>{!c('material') && <div className="field-blank" />}</div>
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

      {/* ═══ MRPeasy BOM List ═══ */}
      {Array.isArray(job.bomList) && (job.bomList as BomEntry[]).length > 0 && (
        <div className="sheet">
          <div className="hdr">
            <div>
              <div className="hdr-title">MRPeasy BOM List</div>
              <div className="hdr-sub">Auto-generated from quote configuration — enter these into MRPeasy</div>
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

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: 16 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '7px 10px', width: 35, color: '#999' }}>#</th>
                <th style={{ padding: '7px 10px', width: 90 }}>BOM / Part</th>
                <th style={{ padding: '7px 10px' }}>Description</th>
                <th style={{ padding: '7px 10px', width: 110 }}>Section</th>
                <th style={{ padding: '7px 10px', width: 70, textAlign: 'center' }}>Entered ✓</th>
              </tr>
            </thead>
            <tbody>
              {(job.bomList as BomEntry[]).map((bom, i) => (
                <tr key={`${bom.code}-${i}`} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '6px 10px', color: '#999', fontSize: '8.5pt' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, color: bom.code === 'TBD' ? '#c0392b' : '#E8681A', fontSize: '10pt' }}>{bom.code}</td>
                  <td style={{ padding: '6px 10px' }}>{bom.note ? `${bom.name} (${bom.note})` : bom.name}</td>
                  <td style={{ padding: '6px 10px', color: '#666', fontSize: '8.5pt' }}>{bom.section}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: '12pt' }}>☐</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Manual entry rows */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: '#999', marginBottom: 6 }}>
              Additional BOMs / Parts (manual)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
              <tbody>
                {[1,2,3,4,5].map(i => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '7px 10px', width: 35, color: '#999' }}>{(job.bomList as BomEntry[]).length + i}</td>
                    <td style={{ padding: '7px 10px', width: 90, borderBottom: '1px dotted #ccc' }} />
                    <td style={{ padding: '7px 10px', borderBottom: '1px dotted #ccc' }} />
                    <td style={{ padding: '7px 10px', width: 110, borderBottom: '1px dotted #ccc' }} />
                    <td style={{ padding: '7px 10px', width: 70, textAlign: 'center', fontSize: '12pt' }}>☐</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: '8.5pt', color: '#666' }}>
            <strong>Note:</strong> This BOM list was auto-generated from the quote configuration. TBD items (shown in red) need manual lookup.
            Tick each item as it&apos;s entered into MRPeasy. Add any extras not captured by the resolver in the blank rows above.
          </div>
        </div>
      )}
    </>
  )
}
