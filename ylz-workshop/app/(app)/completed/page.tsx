'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'

const STAGES = ['Requires Engineering', 'Ready to Start', 'Fab', 'Paint', 'Fitout', 'QC', 'Dispatch']

const STAGE_SHORT: Record<string, string> = {
  'Requires Engineering': 'Eng',
  'Ready to Start': 'Ready',
  'Fab': 'Fab',
  'Paint': 'Paint',
  'Fitout': 'Fitout',
  'QC': 'QC',
  'Dispatch': 'Dispatch',
}

const BTYPE_COLORS: Record<string, string> = {
  'ally-trailer':   '#3b9de8',
  'hardox-trailer': '#e2e2e2',
  'truck':          '#22d07a',
  'wheelbase':      '#8aaec6',
  'dolly':          '#a78bfa',
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
}

export default function CompletedPage() {
  const { data: jobs, isLoading } = useSWR<any[]>('/api/completed', fetcher, { refreshInterval: 60000 })
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!jobs || !Array.isArray(jobs)) return []
    if (!search.trim()) return jobs
    const q = search.toLowerCase()
    return jobs.filter((j) =>
      j.num?.toLowerCase().includes(q) ||
      j.customer?.toLowerCase().includes(q) ||
      j.type?.toLowerCase().includes(q)
    )
  }, [jobs, search])

  function handlePrint() {
    window.print()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            Completed Jobs
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Finished and dispatched jobs with stage completion history
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handlePrint}
            style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 0.8,
              textTransform: 'uppercase', padding: '10px 20px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)',
            }}
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by job number, customer or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 400,
            background: 'var(--dark2)', border: '1px solid var(--border2)', borderRadius: 6,
            color: '#fff', fontSize: 13, padding: '10px 14px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Summary counts */}
      {!isLoading && jobs && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: jobs.length, color: '#fff' },
            { label: 'Dispatched', count: jobs.filter((j) => j.stage === 'Dispatch' || j.prodGroup === 'dispatched').length, color: '#22d07a' },
            { label: 'Finished / Ready to Invoice', count: jobs.filter((j) => j.prodGroup === 'finished' && j.stage !== 'Dispatch').length, color: '#E8681A' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '10px 18px', background: 'var(--dark2)', border: '1px solid var(--border)',
              borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: "'League Spartan', sans-serif" }}>{stat.count}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No completed jobs</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Jobs moved to Finished or Dispatched will appear here</div>
        </div>
      ) : (
        <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 100px 80px 80px 90px',
            gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)',
          }}>
            <span>Job #</span>
            <span>Customer / Type</span>
            <span>Stage</span>
            <span>Due</span>
            <span>Updated</span>
            <span>History</span>
          </div>

          {filtered.map((job) => {
            const expanded = expandedId === job.id
            const btypeColor = BTYPE_COLORS[job.btype] || '#787878'
            const isDispatched = job.stage === 'Dispatch' || job.prodGroup === 'dispatched'

            return (
              <div key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedId(expanded ? null : job.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 100px 80px 80px 90px',
                    gap: 12, padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, color: '#E8681A' }}>
                    {job.num}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{job.customer || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: btypeColor, display: 'inline-block', flexShrink: 0 }} />
                      {job.type}
                    </div>
                  </div>
                  <span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 3,
                      background: isDispatched ? 'rgba(34,197,94,0.1)' : 'rgba(232,104,26,0.1)',
                      color: isDispatched ? '#22c55e' : '#E8681A',
                      border: `1px solid ${isDispatched ? 'rgba(34,197,94,0.3)' : 'rgba(232,104,26,0.3)'}`,
                    }}>
                      {isDispatched ? 'Dispatched' : 'Finished'}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{job.due || '—'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(job.updatedAt)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {Object.keys(job.stageHistory || {}).length} stages {expanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded: stage history */}
                {expanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 12, marginBottom: 10 }}>
                      Stage Completion History
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {STAGES.map((stage) => {
                        const hist = job.stageHistory?.[stage]
                        return (
                          <div
                            key={stage}
                            style={{
                              padding: '10px 14px',
                              background: hist ? 'rgba(34,197,94,0.08)' : 'var(--dark3)',
                              border: `1px solid ${hist ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                              borderRadius: 6,
                              minWidth: 110,
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: hist ? '#22c55e' : 'var(--text3)', marginBottom: 4 }}>
                              {STAGE_SHORT[stage]}
                            </div>
                            {hist ? (
                              <>
                                <div style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{fmtDate(hist.completedAt)}</div>
                                {hist.completedBy && (
                                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{hist.completedBy}</div>
                                )}
                              </>
                            ) : (
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>—</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          button { display: none !important; }
          input { display: none !important; }
        }
      `}</style>
    </div>
  )
}
