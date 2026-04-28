'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useKeithCompletions } from '@/lib/hooks'

interface BrowseItem {
  id: string
  name: string
  mimeType: string
  isFolder: boolean
  webViewLink?: string
  modifiedTime?: string
}

interface BreadcrumbEntry {
  id: string
  name: string
}

const PARTS_ROOT_FOLDER_ID = '1eAs6Dv4F8DdcvNIFWuggfR1YZzHwPZNo'

interface MOSummary {
  moNumbers:    string[]
  product:      string
  quantity:     string
  date:         string
  totalParts:   number
  laserParts:   number
  partNumbers:  string[]
  drawingsFound: string[]
}

const TOOLS = ['Keith Completions', 'Laser Pack Generator', 'Laser BOM Extractor', 'Drive Browser'] as const
type Tool = (typeof TOOLS)[number]

export default function MRPToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('Keith Completions')
  const { data: completions = [] } = useKeithCompletions()
  const pendingCount = Array.isArray(completions) ? completions.length : 0

  return (
    <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
          MRP Tools
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>YLZ MRP Tools</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Ordering checklists, laser packs & parts drive
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tool}
            {tool === 'Keith Completions' && pendingCount > 0 && (
              <span style={{
                background: '#E8681A', color: '#fff', borderRadius: 10,
                fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center',
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTool === 'Keith Completions' && <KeithCompletionsTool />}
      {activeTool === 'Laser Pack Generator' && <LaserPackTool />}
      {activeTool === 'Laser BOM Extractor' && <LaserBomTool />}
      {activeTool === 'Drive Browser' && <DriveBrowserTool />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// KEITH COMPLETIONS — Jobs Keith has marked done (needs MRP update)
// ══════════════════════════════════════════════════════════════════════════

function KeithCompletionsTool() {
  const { data: completions = [], mutate } = useKeithCompletions()
  const [processing, setProcessing] = useState<string | null>(null)

  const rows = Array.isArray(completions) ? completions as any[] : []

  const sectionLabel = (w: any) => {
    if (!w) return '—'
    const labels: Record<string, string> = {
      chassis: 'Truck Chassis', trailer_chassis: 'Trailer Chassis',
      alloy: 'Alloy', hardox: 'Hardox', steel: 'Steel',
      paint: 'Paint', fitout: 'Fitout', trailerfit: 'Trailer Fitout',
      subfit: 'Subframe Fitout',
    }
    return labels[w.section] || labels[w.hdr] || w.section || w.hdr || '—'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Jobs Keith has marked complete in the schedule. Update MRP for each one, then mark it processed.
      </div>

      {rows.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          No completed jobs yet.
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px 140px 100px',
            gap: 8, padding: '6px 14px',
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span>Job</span>
            <span>Section</span>
            <span>Worker</span>
            <span>MO Number</span>
            <span>Completed</span>
            <span></span>
          </div>

          {rows.map((row: any) => {
            const isProcessing = processing === row.id
            return (
              <div
                key={row.id}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px 140px 100px',
                  gap: 8, padding: '10px 14px', alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 800, fontSize: 14, color: '#E8681A' }}>
                  {row.jobNo}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {sectionLabel(row.worker)}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  {row.worker?.name || '—'}
                </span>
                <span style={{
                  fontSize: 11, fontFamily: 'monospace',
                  color: row.moNumber ? '#22d07a' : 'rgba(255,255,255,0.25)',
                  fontWeight: 600,
                }}>
                  {row.moNumber || 'No MO'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {row.completedAt
                    ? new Date(row.completedAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
                <button
                  disabled={isProcessing}
                  onClick={async () => {
                    setProcessing(row.id)
                    try {
                      await fetch('/api/keith/completions', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: row.id }),
                      })
                      mutate()
                    } finally {
                      setProcessing(null)
                    }
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.5)',
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    cursor: isProcessing ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                    fontFamily: "'League Spartan', sans-serif",
                    transition: '0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22d07a'; e.currentTarget.style.color = '#22d07a' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  {isProcessing ? 'Saving…' : 'Done in MRP'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════
// DRIVE BROWSER
// ══════════════════════════════════════════════════════════════════════════

function DriveBrowserTool() {
  const [items, setItems]             = useState<BrowseItem[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb]   = useState<BreadcrumbEntry[]>([
    { id: PARTS_ROOT_FOLDER_ID, name: 'YLZparts' },
  ])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const currentFolder = breadcrumb[breadcrumb.length - 1]
  const isSearching = searchQuery.length > 0

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive-browse?folderId=${folderId}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setItems(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load folder')
    } finally {
      setLoading(false)
    }
  }, [])

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive-browse?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setItems(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSearching) {
      runSearch(searchQuery)
    } else {
      loadFolder(currentFolder.id)
    }
  }, [currentFolder.id, searchQuery, isSearching, loadFolder, runSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    if (q) setSearchQuery(q)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
    searchRef.current?.focus()
  }

  const navigateInto = (item: BrowseItem) => {
    clearSearch()
    setBreadcrumb(prev => [...prev, { id: item.id, name: item.name }])
  }

  const navigateTo = (index: number) => {
    clearSearch()
    setBreadcrumb(prev => prev.slice(0, index + 1))
  }

  const folders = items.filter(i => i.isFolder)
  const files   = items.filter(i => !i.isFolder)

  const fileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return '\uD83D\uDCC4'
    if (mimeType.startsWith('image/')) return '\uD83D\uDDBC\uFE0F'
    return '\uD83D\uDCCE'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Browse the YLZparts Google Drive. Click folders to navigate, click files to open in Drive.
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={searchRef}
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name — e.g. 100-01-001"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${isSearching ? '#E8681A' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 6, padding: '10px 36px 10px 14px',
              fontSize: 13, color: '#fff', outline: 'none',
            }}
          />
          {(searchInput || isSearching) && (
            <button
              type="button"
              onClick={clearSearch}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)', fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={!searchInput.trim()}
          style={{
            padding: '10px 18px', borderRadius: 6, border: 'none',
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            background: searchInput.trim() ? '#E8681A' : 'rgba(255,255,255,0.08)',
            color: searchInput.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: searchInput.trim() ? 'pointer' : 'not-allowed',
            transition: '0.15s', whiteSpace: 'nowrap',
          }}
        >
          Search
        </button>
      </form>

      {isSearching && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Search results for <span style={{ color: '#fff', fontWeight: 600 }}>&ldquo;{searchQuery}&rdquo;</span>
          {' '}&mdash; {items.length} result{items.length !== 1 ? 's' : ''} &middot;{' '}
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8681A', fontSize: 12, padding: 0 }}>
            Back to folder
          </button>
        </div>
      )}

      {!isSearching && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '8px 14px', fontSize: 12,
        }}>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>&rsaquo;</span>}
              <button
                onClick={() => navigateTo(i)}
                disabled={i === breadcrumb.length - 1}
                style={{
                  background: 'none', border: 'none', cursor: i === breadcrumb.length - 1 ? 'default' : 'pointer',
                  color: i === breadcrumb.length - 1 ? '#fff' : '#E8681A',
                  fontWeight: i === breadcrumb.length - 1 ? 700 : 400,
                  fontSize: 12, padding: 0,
                }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
          <button
            onClick={() => loadFolder(currentFolder.id)}
            title="Refresh"
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '0 4px',
            }}
          >
            &#8635;
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(232,68,96,0.1)', border: '1px solid rgba(232,68,96,0.3)',
          borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e84560',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
          Loading&hellip;
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Empty folder
            </div>
          )}

          {folders.map(item => (
            <button
              key={item.id}
              onClick={() => navigateInto(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, padding: '10px 14px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: '0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,104,26,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{'\uD83D\uDCC1'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>&rsaquo;</span>
            </button>
          ))}

          {files.map(item => (
            <a
              key={item.id}
              href={item.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6, padding: '10px 14px',
                textDecoration: 'none', transition: '0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(item.mimeType)}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>&nearr; Open</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// LASER PACK GENERATOR
// ══════════════════════════════════════════════════════════════════════════

function LaserPackTool() {
  const [moPdfs, setMoPdfs]     = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<MOSummary | null>(null)
  const [pdfBlob, setPdfBlob]   = useState<Blob | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files)
    const pdfs = arr.filter(f => f.type === 'application/pdf')
    if (pdfs.length !== arr.length) setError('Some files skipped — only PDFs accepted.')
    else setError(null)
    setMoPdfs(prev => [...prev, ...pdfs])
    setResult(null); setPdfBlob(null)
  }

  const removeFile = (index: number) => {
    setMoPdfs(prev => prev.filter((_, i) => i !== index))
  }

  const onProcess = async () => {
    if (!moPdfs.length) return
    setLoading(true); setError(null); setResult(null); setPdfBlob(null)
    try {
      const fd = new FormData()
      for (const f of moPdfs) fd.append('pdf', f)

      const res = await fetch('/api/mrp-tools/laser-pack', { method: 'POST', body: fd })

      if (!res.ok) {
        const text = await res.text()
        let message = 'Something went wrong.'
        try { message = JSON.parse(text).error ?? message } catch { /* HTML error page */ }
        throw new Error(message)
      }

      const moData = res.headers.get('X-MO-Data')
      if (moData) setResult(JSON.parse(decodeURIComponent(moData)))
      setPdfBlob(await res.blob())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  const onDownload = () => {
    if (!pdfBlob || !result) return
    const label = result.moNumbers.length === 1
      ? result.moNumbers[0]
      : `Combined (${result.moNumbers.length} MOs)`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(pdfBlob)
    a.download = `${label} Laser Sheet.pdf`
    a.click()
  }

  const reset = () => {
    setMoPdfs([]); setResult(null); setPdfBlob(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 }}>

      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Upload one or more MRPeasy Manufacturing Order PDFs. Parts from all MOs are merged into one sheet. Drawings are fetched automatically from the YLZparts Google Drive folder.
      </div>

      {!result ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging || moPdfs.length ? '#E8681A' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 8,
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(232,104,26,0.08)' : moPdfs.length ? 'rgba(232,104,26,0.05)' : 'rgba(255,255,255,0.02)',
              transition: '0.15s',
            }}
          >
            <input ref={inputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }} />
            <div style={{ fontSize: 28, marginBottom: 10 }}>&uarr;</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
              Drop MRPeasy MO PDFs here
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>or click to browse &mdash; multiple files supported</div>
          </div>

          {moPdfs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {moPdfs.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(232,104,26,0.12)', border: '1px solid rgba(232,104,26,0.35)',
                  borderRadius: 5, padding: '5px 10px', fontSize: 12, color: '#fff',
                }}>
                  <span>{'\uD83D\uDCC4'} {f.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(i) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1,
                      padding: '0 2px',
                    }}
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '10px 14px', fontSize: 12, color: 'var(--text3)',
          }}>
            <span style={{ fontSize: 16 }}>{'\uD83D\uDCC1'}</span>
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
            disabled={!moPdfs.length || loading}
            style={{
              padding: '14px 20px', borderRadius: 6, border: 'none',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              cursor: !moPdfs.length || loading ? 'not-allowed' : 'pointer',
              background: !moPdfs.length || loading ? 'rgba(255,255,255,0.08)' : '#E8681A',
              color: !moPdfs.length || loading ? 'rgba(255,255,255,0.3)' : '#fff',
              transition: '0.15s',
            }}
          >
            {loading
              ? 'Searching Drive & Generating\u2026'
              : moPdfs.length > 1
                ? `Generate Combined Sheet (${moPdfs.length} MOs)`
                : 'Generate Laser Sheet'}
          </button>
        </>
      ) : (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>

          <div style={{ background: '#E8681A', padding: '14px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              Laser Sheet Ready
            </div>
            <div style={{ fontSize: result.moNumbers.length > 1 ? 14 : 22, fontWeight: 700, color: '#fff' }}>
              {result.moNumbers.length === 1
                ? result.moNumbers[0]
                : result.moNumbers.join('  \u00B7  ')}
            </div>
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
                    {pn}{hasDrawing ? ' \u2713' : ''}
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

// ══════════════════════════════════════════════════════════════════════════
// LASER BOM EXTRACTOR
// ══════════════════════════════════════════════════════════════════════════

interface BomStats {
  totalPairs: number
  rowsProduced: number
  failures: number
  unknownCodes: number
}

const DEFAULT_FOLDER_ID = '15mg2nsgwGNDJH8mMxS7dDhmZpKIFCLAl'

function LaserBomTool() {
  const [folderId, setFolderId]   = useState(DEFAULT_FOLDER_ID)
  const [recursive, setRecursive] = useState(false)
  const [limit, setLimit]         = useState<string>('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [stats, setStats]         = useState<BomStats | null>(null)
  const [csvBlob, setCsvBlob]     = useState<Blob | null>(null)

  const onRun = async () => {
    setLoading(true); setError(null); setStats(null); setCsvBlob(null)
    try {
      const body: Record<string, unknown> = { folderId, recursive }
      const n = parseInt(limit)
      if (!isNaN(n) && n > 0) body.limit = n

      const res = await fetch('/api/mrp-tools/extract-laser-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        let message = 'Something went wrong.'
        try { message = JSON.parse(text).error ?? message } catch { /* raw text */ }
        throw new Error(message)
      }

      const statsHeader = res.headers.get('X-Stats')
      if (statsHeader) setStats(JSON.parse(decodeURIComponent(statsHeader)))
      setCsvBlob(await res.blob())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setLoading(false)
    }
  }

  const onDownload = () => {
    if (!csvBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(csvBlob)
    a.download = 'laser_bom.csv'
    a.click()
  }

  const reset = () => { setStats(null); setCsvBlob(null); setError(null) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Walks the YLZ Parts Drive folder, extracts geometry from each DXF and material
        info from each PDF title block, and outputs a CSV ready for MRPeasy import.
      </div>

      {/* Folder ID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          Drive Folder ID
        </label>
        <input
          type="text"
          value={folderId}
          onChange={e => setFolderId(e.target.value)}
          placeholder={DEFAULT_FOLDER_ID}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, padding: '10px 14px', fontSize: 12,
            color: '#fff', outline: 'none', fontFamily: 'monospace',
          }}
        />
      </div>

      {/* Options row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Recursive */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setRecursive(v => !v)}
            style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${recursive ? '#E8681A' : 'rgba(255,255,255,0.25)'}`,
              background: recursive ? '#E8681A' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: '0.15s',
            }}
          >
            {recursive && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>&#10003;</span>}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Recursive (include subfolders)</span>
        </label>

        {/* Limit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Limit</span>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            placeholder="all"
            min={1}
            style={{
              width: 72, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              padding: '8px 10px', fontSize: 12, color: '#fff', outline: 'none',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>pairs</span>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(232,68,96,0.1)', border: '1px solid rgba(232,68,96,0.3)',
          borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e84560',
        }}>
          {error}
        </div>
      )}

      {!stats ? (
        <button
          onClick={onRun}
          disabled={!folderId.trim() || loading}
          style={{
            padding: '14px 20px', borderRadius: 6, border: 'none',
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            cursor: !folderId.trim() || loading ? 'not-allowed' : 'pointer',
            background: !folderId.trim() || loading ? 'rgba(255,255,255,0.08)' : '#E8681A',
            color: !folderId.trim() || loading ? 'rgba(255,255,255,0.3)' : '#fff',
            transition: '0.15s',
          }}
        >
          {loading ? 'Extracting BOM…' : 'Generate BOM CSV'}
        </button>
      ) : (
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: '#E8681A', padding: '14px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
              BOM Extraction Complete
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {stats.rowsProduced} rows
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '14px 20px', gap: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {([
              { label: 'Pairs found',   value: String(stats.totalPairs) },
              { label: 'Rows produced', value: String(stats.rowsProduced), accent: true },
              { label: 'Failures',      value: String(stats.failures),     warn: stats.failures > 0 },
              { label: 'Unknown codes', value: String(stats.unknownCodes), warn: stats.unknownCodes > 0 },
            ] as Array<{ label: string; value: string; accent?: boolean; warn?: boolean }>).map(({ label, value, accent, warn }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: accent ? '#E8681A' : warn ? '#f0a830' : '#fff' }}>{value}</div>
              </div>
            ))}
          </div>

          {stats.unknownCodes > 0 && (
            <div style={{ padding: '10px 20px', fontSize: 11, color: '#f0a830', borderBottom: '1px solid rgba(255,255,255,0.06)', lineHeight: 1.5 }}>
              {stats.unknownCodes} part{stats.unknownCodes !== 1 ? 's' : ''} have no material code &mdash; material text didn&apos;t match a known grade/thickness. Check the CSV and update manually or expand the material table.
            </div>
          )}

          <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onDownload} style={{
              flex: 1, padding: '12px 16px', borderRadius: 6, border: 'none',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              background: '#E8681A', color: '#fff', cursor: 'pointer',
            }}>
              Download laser_bom.csv
            </button>
            <button onClick={reset} style={{
              padding: '12px 16px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
              fontSize: 12, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}>
              New Run
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
