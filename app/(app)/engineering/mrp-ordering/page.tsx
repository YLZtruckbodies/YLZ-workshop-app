'use client'

import { useCallback, useEffect, useState } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface BomEntry {
  code: string
  name: string
  category: string
  section: string
  auto: boolean
}

interface QuoteSummary {
  id: string
  quoteNumber: string
  customerName: string
  buildType: string
  status: string
  jobId: string | null
}

interface JobSummary {
  id: string
  num: string
  type: string
  customer: string
  bomList: BomEntry[]
}

// ── Styles ───────────────────────────────────────────────────────────────────

const C = {
  copper: '#E8681A',
  copperDim: 'rgba(232,104,26,0.1)',
  copperBorder: 'rgba(232,104,26,0.4)',
  red: '#c0392b',
  green: '#27ae60',
  bg: 'var(--dark1, #0a0a0a)',
  panel: 'var(--dark2, #141414)',
  card: 'var(--dark3, #1e1e1e)',
  border: 'var(--border, #2a2a2a)',
  text1: '#fff',
  text2: '#aaa',
  text3: '#666',
  mono: "'Courier New', monospace",
  font: "'League Spartan', system-ui, sans-serif",
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MrpOrderingPage() {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([])
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [bomList, setBomList] = useState<BomEntry[]>([])
  const [manualBoms, setManualBoms] = useState<BomEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBoms, setLoadingBoms] = useState(false)
  const [searchJob, setSearchJob] = useState('')
  const [tab, setTab] = useState<'quotes' | 'jobs'>('jobs')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [addCode, setAddCode] = useState('')
  const [addName, setAddName] = useState('')
  const [addSection, setAddSection] = useState('')
  const [copied, setCopied] = useState(false)
  const [jobMeta, setJobMeta] = useState<{ num: string; type: string; customer: string } | null>(null)

  // Load quotes and jobs on mount
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/quotes').then(r => r.json()),
      fetch('/api/jobs').then(r => r.json()),
    ]).then(([q, j]) => {
      setQuotes(Array.isArray(q) ? q : [])
      setJobs(Array.isArray(j) ? j.slice(0, 200) : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Load BOMs for a quote
  const loadQuoteBoms = useCallback(async (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    setSelectedJobId(null)
    setLoadingBoms(true)
    setManualBoms([])
    try {
      const res = await fetch(`/api/quotes/${quoteId}/boms`)
      const data = await res.json()
      setBomList(data.resolvedBoms || [])
      setJobMeta(data.job ? { num: data.job.jobNum, type: data.buildType, customer: data.customer } : { num: '—', type: data.buildType, customer: data.customer })
    } catch { setBomList([]) }
    setLoadingBoms(false)
  }, [])

  // Load BOMs for a job
  const loadJobBoms = useCallback(async (jobId: string) => {
    setSelectedJobId(jobId)
    setSelectedQuoteId(null)
    setLoadingBoms(true)
    setManualBoms([])
    try {
      const res = await fetch(`/api/jobs/${jobId}/boms`)
      const data = await res.json()
      setBomList(data.bomList || [])
      setJobMeta({ num: data.jobNum, type: data.jobType, customer: data.customer })
    } catch { setBomList([]) }
    setLoadingBoms(false)
  }, [])

  // Search for job by number
  const searchForJob = useCallback(async () => {
    if (!searchJob.trim()) return
    setLoadingBoms(true)
    setManualBoms([])
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(searchJob.trim())}/boms`)
      const data = await res.json()
      if (data.error) {
        alert(`Job not found: ${searchJob}`)
        setLoadingBoms(false)
        return
      }
      setBomList(data.bomList || [])
      setJobMeta({ num: data.jobNum, type: data.jobType, customer: data.customer })
      setSelectedJobId(data.jobNum)
      setSelectedQuoteId(null)
    } catch { alert('Failed to load job') }
    setLoadingBoms(false)
  }, [searchJob])

  // All BOMs (resolved + manual)
  const allBoms = [...bomList, ...manualBoms]

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const items = [...allBoms]
    const [moved] = items.splice(dragIdx, 1)
    items.splice(idx, 0, moved)
    // Split back into auto and manual
    const autoCount = bomList.length
    setBomList(items.slice(0, autoCount))
    setManualBoms(items.slice(autoCount))
    setDragIdx(idx)
  }
  const handleDragEnd = () => setDragIdx(null)

  // Remove a BOM
  const removeBom = (idx: number) => {
    if (idx < bomList.length) {
      setBomList(prev => prev.filter((_, i) => i !== idx))
    } else {
      setManualBoms(prev => prev.filter((_, i) => i !== idx - bomList.length))
    }
  }

  // Add manual BOM
  const addManualBom = () => {
    if (!addCode.trim()) return
    setManualBoms(prev => [...prev, {
      code: addCode.trim().toUpperCase(),
      name: addName.trim() || addCode.trim(),
      category: 'Manual',
      section: addSection.trim() || 'Manual',
      auto: false,
    }])
    setAddCode('')
    setAddName('')
    setAddSection('')
  }

  // Copy BOM list for MRPeasy
  const copyForMrp = () => {
    const header = jobMeta ? `Job: ${jobMeta.num} — ${jobMeta.customer} — ${jobMeta.type}\n${'─'.repeat(60)}\n` : ''
    const lines = allBoms.map((b, i) =>
      `${i + 1}.\t${b.code}\t${b.name}\t${b.section}`
    ).join('\n')
    navigator.clipboard.writeText(header + lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: C.text3 }}>
            <a href="/engineering" style={{ color: C.text3, textDecoration: 'none' }}>← Engineering</a>
          </div>
          <h1 style={{ fontFamily: C.font, fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.text1, margin: '4px 0 0' }}>
            MRP Ordering
          </h1>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
            Select a job or quote → see the auto-resolved BOM list → drag to reorder → copy for MRPeasy entry
          </div>
        </div>

        {/* Quick job search */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="Job # (e.g. YLZ 1102)"
            value={searchJob}
            onChange={e => setSearchJob(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchForJob()}
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
              padding: '8px 12px', color: C.text1, fontSize: 13, width: 200,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={searchForJob}
            style={{
              background: C.copper, border: 'none', borderRadius: 6,
              padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 0.5,
            }}
          >
            Load BOMs
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Job/Quote selector ── */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {(['jobs', 'quotes'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                  background: tab === t ? C.copperDim : 'transparent',
                  color: tab === t ? C.copper : C.text3,
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  borderBottom: tab === t ? `2px solid ${C.copper}` : '2px solid transparent',
                }}
              >
                {t === 'jobs' ? `Jobs (${jobs.length})` : `Quotes (${quotes.length})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: C.text3, fontSize: 12 }}>Loading…</div>
            ) : tab === 'jobs' ? (
              jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => loadJobBoms(job.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '10px 14px', border: 'none', borderBottom: `1px solid ${C.border}`,
                    background: selectedJobId === job.id ? C.copperDim : 'transparent',
                    borderLeft: selectedJobId === job.id ? `3px solid ${C.copper}` : '3px solid transparent',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: C.mono }}>{job.num}</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{job.customer || '—'}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{job.type}</div>
                </button>
              ))
            ) : (
              quotes.filter(q => q.status === 'accepted' || q.status === 'sent').map(q => (
                <button
                  key={q.id}
                  onClick={() => loadQuoteBoms(q.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    padding: '10px 14px', border: 'none', borderBottom: `1px solid ${C.border}`,
                    background: selectedQuoteId === q.id ? C.copperDim : 'transparent',
                    borderLeft: selectedQuoteId === q.id ? `3px solid ${C.copper}` : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: C.mono }}>{q.quoteNumber}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                      background: q.status === 'accepted' ? 'rgba(39,174,96,0.15)' : 'rgba(232,104,26,0.15)',
                      color: q.status === 'accepted' ? C.green : C.copper,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>{q.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{q.customerName || '—'}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{q.buildType}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: BOM list ── */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* BOM header */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {jobMeta ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.copper, fontFamily: C.mono }}>{jobMeta.num}</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{jobMeta.customer} — {jobMeta.type}</div>
                </>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text3 }}>Select a job or quote →</div>
              )}
            </div>
            {allBoms.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={copyForMrp}
                  style={{
                    background: copied ? C.green : C.copper, border: 'none', borderRadius: 6,
                    padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: 0.5, transition: 'background 0.2s',
                  }}
                >
                  {copied ? '✓ Copied' : '📋 Copy for MRPeasy'}
                </button>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '8px 12px', fontSize: 12, color: C.text2,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontWeight: 700, color: C.copper, fontSize: 16 }}>{allBoms.length}</span>
                  <span>BOMs</span>
                  {allBoms.filter(b => b.code === 'TBD').length > 0 && (
                    <span style={{ color: C.red, fontWeight: 700, marginLeft: 4 }}>
                      ({allBoms.filter(b => b.code === 'TBD').length} TBD)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOM list */}
          <div style={{ padding: '8px 0', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
            {loadingBoms ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.text3, fontSize: 13 }}>Resolving BOMs…</div>
            ) : allBoms.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: C.text3 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13 }}>Select a job or quote to load the BOM list</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Or type a job number in the search box above</div>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '36px 100px 1fr 120px 36px',
                  padding: '6px 16px', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                  textTransform: 'uppercase', color: C.text3, borderBottom: `1px solid ${C.border}`,
                }}>
                  <div>#</div>
                  <div>BOM / Part</div>
                  <div>Description</div>
                  <div>Section</div>
                  <div></div>
                </div>

                {/* BOM rows — draggable */}
                {allBoms.map((bom, idx) => (
                  <div
                    key={`${bom.code}-${idx}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'grid', gridTemplateColumns: '36px 100px 1fr 120px 36px',
                      padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                      alignItems: 'center', cursor: 'grab',
                      background: dragIdx === idx ? C.copperDim : (bom.code === 'TBD' ? 'rgba(192,57,43,0.08)' : 'transparent'),
                      borderLeft: !bom.auto ? `3px solid ${C.green}` : bom.code === 'TBD' ? `3px solid ${C.red}` : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.copperDim }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = bom.code === 'TBD' ? 'rgba(192,57,43,0.08)' : 'transparent' }}
                  >
                    <div style={{ fontSize: 11, color: C.text3, cursor: 'grab' }}>⠿ {idx + 1}</div>
                    <div style={{
                      fontFamily: C.mono, fontSize: 12, fontWeight: 700,
                      color: bom.code === 'TBD' ? C.red : C.copper,
                    }}>
                      {bom.code}
                    </div>
                    <div style={{ fontSize: 12, color: C.text2 }}>{bom.name}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{bom.section}</div>
                    <button
                      onClick={() => removeBom(idx)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: C.text3, fontSize: 16, padding: 0, lineHeight: 1,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = C.red }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = C.text3 }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Add manual BOM */}
          {(allBoms.length > 0 || selectedJobId || selectedQuoteId) && (
            <div style={{
              padding: '12px 16px', borderTop: `1px solid ${C.border}`,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input
                placeholder="BOM code"
                value={addCode}
                onChange={e => setAddCode(e.target.value)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: '6px 10px', color: C.text1, fontSize: 12, width: 100,
                  fontFamily: C.mono,
                }}
              />
              <input
                placeholder="Description"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: '6px 10px', color: C.text1, fontSize: 12, flex: 1,
                }}
              />
              <input
                placeholder="Section"
                value={addSection}
                onChange={e => setAddSection(e.target.value)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: '6px 10px', color: C.text1, fontSize: 12, width: 110,
                }}
              />
              <button
                onClick={addManualBom}
                onKeyDown={e => e.key === 'Enter' && addManualBom()}
                style={{
                  background: C.card, border: `1px solid ${C.copperBorder}`, borderRadius: 4,
                  padding: '6px 12px', color: C.copper, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
