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
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
          MRP Tools
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>YLZ MRP Tools</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Automation tools for MRPeasy workflows
        </p>
      </div>

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

      {activeTool === 'Laser Pack Generator' && <LaserPackTool />}
    </div>
  )
}

function LaserPackTool() {
  const [moPdf, setMoPdf]       = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<MOSummary | null>(null)
  const [pdfBlob, setPdfBlob]   = useState<Blob | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') { setError('File must be a PDF.'); return }
    setMoPdf(f); setError(null); setResult(null); setPdfBlob(null)
  }

  const onProcess = async () => {
    if (!moPdf) return
    setLoading(true); setError(null); setResult(null); setPdfBlob(null)
    try {
      const fd = new FormData()
      fd.append('pdf', moPdf)

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
    setMoPdf(null); setResult(null); setPdfBlob(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 }}>

      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Upload an MRPeasy Manufacturing Order PDF. Part drawings are fetched automatically from the YLZparts Google Drive folder.
      </div>

      {!result ? (
        <>
          {/* MO PDF drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging || moPdf ? '#E8681A' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 8,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(232,104,26,0.08)' : moPdf ? 'rgba(232,104,26,0.05)' : 'rgba(255,255,255,0.02)',
              transition: '0.15s',
            }}
          >
            <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {moPdf ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{moPdf.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {(moPdf.size / 1024).toFixed(0)} KB · Click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, marginBottom: 10 }}>↑</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                  Drop MRPeasy MO PDF here
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>or click to browse</div>
              </>
            )}
          </div>

          {/* Drive note */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--text3)',
          }}>
            <span style={{ fontSize: 16 }}>📁</span>
            Drawings auto-fetched from <span style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>YLZparts Google Drive</span>
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
              padding: '14px 20px', borderRadius: 6, border: 'none',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              cursor: !moPdf || loading ? 'not-allowed' : 'pointer',
              background: !moPdf || loading ? 'rgba(255,255,255,0.08)' : '#E8681A',
              color: !moPdf || loading ? 'rgba(255,255,255,0.3)' : '#fff',
              transition: '0.15s',
            }}
          >
            {loading ? 'Searching Drive & Generating…' : 'Generate Laser Sheet'}
          </button>
        </>
      ) : (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>

          <div style={{ background: '#E8681A', padding: '14px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              Laser Sheet Ready
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{result.moNumber}</div>
          </div>

          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>Product</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{result.product}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', padding: '12px 20px', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Date',        value: result.date },
              { label: 'Qty',         value: result.quantity },
              { label: 'Laser Parts', value: String(result.laserParts > 0 ? result.laserParts : result.totalParts), accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: accent ? '#E8681A' : '#fff' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
              Parts on Sheet
              <span style={{ marginLeft: 8, color: '#22d07a', fontWeight: 400 }}>
                {result.drawingsFound.length}/{result.partNumbers.length} drawings found
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {result.partNumbers.map(pn => {
                const hasDrawing = result.drawingsFound.includes(pn)
                return (
                  <span key={pn} style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace',
                    background: '#1a1a1a',
                    border: `1px solid ${hasDrawing ? '#E8681A' : 'rgba(255,255,255,0.12)'}`,
                    color: hasDrawing ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}>
                    {pn}{hasDrawing ? ' ✓' : ''}
                  </span>
                )
              })}
            </div>
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onDownload} style={{
              flex: 1, padding: '12px 16px', borderRadius: 6, border: 'none',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              background: '#E8681A', color: '#fff', cursor: 'pointer',
            }}>
              Download Laser Sheet PDF
            </button>
            <button onClick={reset} style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
              fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}>
              New MO
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
