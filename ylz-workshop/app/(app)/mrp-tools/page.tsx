'use client'

import { useState, useRef } from 'react'

interface MOSummary {
  moNumber:     string
  product:      string
  quantity:     string
  date:         string
  totalParts:   number
  laserParts:   number
  partNumbers:  string[]
  drawingsFound: string[]
}

const TOOLS = ['Laser Pack Generator'] as const
type Tool = (typeof TOOLS)[number]

export default function MRPToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('Laser Pack Generator')

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
          MRP Tools
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>YLZ MRP Tools</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Automation tools for MRPeasy workflows
        </p>
      </div>

      {/* Tool tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {TOOLS.map(tool => (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            style={{
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              border: 'none',
              borderBottom: `2px solid ${activeTool === tool ? '#E8681A' : 'transparent'}`,
              background: 'transparent',
              color: activeTool === tool ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: '0.15s',
              marginBottom: -1,
            }}
          >
            {tool}
          </button>
        ))}
      </div>

      {/* Tool content */}
      {activeTool === 'Laser Pack Generator' && <LaserPackTool />}
    </div>
  )
}

// ─── Laser Pack Generator ──────────────────────────────────────────────────────

function LaserPackTool() {
  const [moPdf, setMoPdf]           = useState<File | null>(null)
  const [drawings, setDrawings]     = useState<File[]>([])
  const [draggingMO, setDraggingMO] = useState(false)
  const [draggingDr, setDraggingDr] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [result, setResult]         = useState<MOSummary | null>(null)
  const [pdfBlob, setPdfBlob]       = useState<Blob | null>(null)

  const moInputRef = useRef<HTMLInputElement>(null)
  const drInputRef = useRef<HTMLInputElement>(null)

  const handleMO = (f: File) => {
    if (f.type !== 'application/pdf') { setError('MO must be a PDF.'); return }
    setMoPdf(f); setError(null); setResult(null); setPdfBlob(null)
  }

  const handleDrawings = (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf')
    setDrawings(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...pdfs.filter(f => !existing.has(f.name))]
    })
  }

  const removeDrawing = (name: string) => setDrawings(prev => prev.filter(f => f.name !== name))

  const onProcess = async () => {
    if (!moPdf) return
    setLoading(true); setError(null); setResult(null); setPdfBlob(null)
    try {
      const fd = new FormData()
      fd.append('pdf', moPdf)
      drawings.forEach(f => fd.append('drawing', f))

      const res = await fetch('/api/mrp-tools/laser-pack', { method: 'POST', body: fd })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Something went wrong.')
      }

      const moData = res.headers.get('X-MO-Data')
      if (moData) setResult(JSON.parse(moData))
      setPdfBlob(await res.blob())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  const onDownload = () => {
    if (!pdfBlob || !result) return
    const url = URL.createObjectURL(pdfBlob)
    const a   = document.createElement('a')
    a.href = url; a.download = `${result.moNumber} Laser Sheet.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setMoPdf(null); setDrawings([]); setResult(null); setPdfBlob(null); setError(null)
    if (moInputRef.current) moInputRef.current.value = ''
    if (drInputRef.current) drInputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>

      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Upload an MRPeasy Manufacturing Order PDF and (optionally) part drawing PDFs.
        Generates a grouped laser cutting sheet with 2D thumbnails.
      </div>

      {!result ? (
        <>
          {/* Step 1 — MO PDF */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
              Step 1 — MO PDF <span style={{ color: '#E8681A' }}>*</span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDraggingMO(true) }}
              onDragLeave={() => setDraggingMO(false)}
              onDrop={e => { e.preventDefault(); setDraggingMO(false); const f = e.dataTransfer.files[0]; if (f) handleMO(f) }}
              onClick={() => moInputRef.current?.click()}
              style={{
                border: `2px dashed ${draggingMO || moPdf ? '#E8681A' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 8,
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: draggingMO ? 'rgba(232,104,26,0.08)' : moPdf ? 'rgba(232,104,26,0.05)' : 'rgba(255,255,255,0.02)',
                transition: '0.15s',
              }}
            >
              <input ref={moInputRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleMO(f) }} />
              {moPdf ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{moPdf.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    {(moPdf.size / 1024).toFixed(0)} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>↑</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                    Drop MRPeasy MO PDF here
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>or click to browse</div>
                </>
              )}
            </div>
          </div>

          {/* Step 2 — Drawings */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
              Step 2 — Part Drawing PDFs{' '}
              <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                (optional — for 2D thumbnails)
              </span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDraggingDr(true) }}
              onDragLeave={() => setDraggingDr(false)}
              onDrop={e => { e.preventDefault(); setDraggingDr(false); handleDrawings(e.dataTransfer.files) }}
              onClick={() => drInputRef.current?.click()}
              style={{
                border: `2px dashed ${draggingDr ? '#E8681A' : drawings.length > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 8,
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: draggingDr ? 'rgba(232,104,26,0.08)' : 'rgba(255,255,255,0.02)',
                transition: '0.15s',
              }}
            >
              <input ref={drInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files) handleDrawings(e.target.files) }} />
              {drawings.length === 0 ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                    Drop part drawing PDFs from YLZparts
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                    Select multiple files — named by part number (e.g. 100-01-337.pdf)
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {drawings.length} drawing{drawings.length !== 1 ? 's' : ''} added · Click to add more
                </div>
              )}
            </div>

            {drawings.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {drawings.map(f => (
                  <span key={f.name} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
                    color: 'var(--text2)',
                  }}>
                    {f.name}
                    <button
                      onClick={e => { e.stopPropagation(); removeDrawing(f.name) }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(232,68,96,0.1)', border: '1px solid rgba(232,68,96,0.3)',
              borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e84560',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={onProcess}
            disabled={!moPdf || loading}
            style={{
              padding: '14px 20px',
              borderRadius: 6,
              border: 'none',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: !moPdf || loading ? 'not-allowed' : 'pointer',
              background: !moPdf || loading ? 'rgba(255,255,255,0.08)' : '#E8681A',
              color: !moPdf || loading ? 'rgba(255,255,255,0.3)' : '#fff',
              transition: '0.15s',
            }}
          >
            {loading ? 'Generating…' : 'Generate Laser Sheet'}
          </button>
        </>
      ) : (
        /* Result card */
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>

          {/* Result header */}
          <div style={{ background: '#E8681A', padding: '14px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              Laser Sheet Ready
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{result.moNumber}</div>
          </div>

          {/* Product */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
              Product
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{result.product}</div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', padding: '12px 20px', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Date',        value: result.date },
              { label: 'Qty',         value: result.quantity },
              { label: 'Laser Parts', value: String(result.laserParts > 0 ? result.laserParts : result.totalParts), accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: accent ? '#E8681A' : '#fff' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Parts list */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
              Parts on Sheet
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.partNumbers.map(pn => {
                const hasDrawing = result.drawingsFound.includes(pn)
                return (
                  <span key={pn} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
                    background: '#1a1a1a',
                    border: `1px solid ${hasDrawing ? '#E8681A' : 'rgba(255,255,255,0.12)'}`,
                    color: hasDrawing ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}>
                    {pn}{hasDrawing ? ' +dwg' : ''}
                  </span>
                )
              })}
            </div>
            {result.drawingsFound.length < result.partNumbers.length && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
                {result.partNumbers.length - result.drawingsFound.length} part(s) without drawing — placeholder shown on sheet
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
            <button
              onClick={onDownload}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 6, border: 'none',
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                background: '#E8681A', color: '#fff', cursor: 'pointer',
              }}
            >
              Download Laser Sheet PDF
            </button>
            <button
              onClick={reset}
              style={{
                padding: '12px 16px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}
            >
              New MO
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
