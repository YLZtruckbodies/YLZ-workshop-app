'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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

const TOOLS = ['Laser Pack Generator', 'Drive Browser'] as const
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
      {activeTool === 'Drive Browser' && <DriveBrowserTool />}
    </div>
  )
}

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
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.startsWith('image/')) return '🖼️'
    return '📎'
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

      {/* Search results label */}
      {isSearching && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Search results for <span style={{ color: '#fff', fontWeight: 600 }}>&ldquo;{searchQuery}&rdquo;</span>
          {' '}— {items.length} result{items.length !== 1 ? 's' : ''} ·{' '}
          <button onClick={clearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8681A', fontSize: 12, padding: 0 }}>
            Back to folder
          </button>
        </div>
      )}

      {/* Breadcrumb — hidden during search */}
      {!isSearching && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '8px 14px', fontSize: 12,
        }}>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>}
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
            ↻
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
          Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.length === 0 && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              Empty folder
            </div>
          )}

          {/* Folders first */}
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
              <span style={{ fontSize: 16, flexShrink: 0 }}>📁</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>›</span>
            </button>
          ))}

          {/* Files */}
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
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>↗ Open</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

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
            <div style={{ fontSize: 28, marginBottom: 10 }}>↑</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
              Drop MRPeasy MO PDFs here
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>or click to browse — multiple files supported</div>
          </div>

          {/* File chips */}
          {moPdfs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {moPdfs.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(232,104,26,0.12)', border: '1px solid rgba(232,104,26,0.35)',
                  borderRadius: 5, padding: '5px 10px', fontSize: 12, color: '#fff',
                }}>
                  <span>📄 {f.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(i) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1,
                      padding: '0 2px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

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
              ? 'Searching Drive & Generating…'
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
                : result.moNumbers.join('  ·  ')}
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
