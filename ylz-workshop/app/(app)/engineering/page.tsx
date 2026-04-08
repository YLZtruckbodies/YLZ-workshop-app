'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface EngineeringJob {
  id: string
  num: string
  type: string
  customer: string
  make: string
  dims: string
  createdAt: string
  quoteId?: string
}

export default function EngineeringPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<EngineeringJob[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?stage=Requires Engineering')
      if (res.ok) {
        const jobs = await res.json()
        // Fetch linked quote IDs for each job
        const enriched = await Promise.all(
          jobs.map(async (job: any) => {
            let quoteId = ''
            try {
              const qRes = await fetch(`/api/quotes?jobId=${job.id}`)
              if (qRes.ok) {
                const quotes = await qRes.json()
                if (quotes.length > 0) quoteId = quotes[0].id
              }
            } catch { /* ignore */ }
            return { ...job, quoteId }
          })
        )
        setDrafts(enriched)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  const approveJob = async (jobId: string) => {
    setApproving(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _userName: 'Engineering' }),
      })
      if (res.ok) {
        setDrafts((prev) => prev.filter((j) => j.id !== jobId))
      }
    } catch { /* ignore */ }
    setApproving(null)
  }

  const cardStyle = {
    background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '20px 16px', cursor: 'pointer' as const,
    display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'flex-start' as const, gap: 8,
    transition: 'all 0.2s', textAlign: 'left' as const,
  }

  const btnStyle = (color: string) => ({
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 11, fontWeight: 700 as const, letterSpacing: 0.5, textTransform: 'uppercase' as const,
    padding: '7px 14px', borderRadius: 5, cursor: 'pointer' as const,
    border: `1px solid ${color}`, background: 'transparent', color,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Engineering
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Track engineering specs, drawings, and build requirements.
        </div>
      </div>

      {/* Engineering Queue */}
      {!loading && drafts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: '#E8681A', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⚙️</span>
            Awaiting Engineering Approval ({drafts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {drafts.map((job) => (
              <div
                key={job.id}
                style={{
                  background: 'var(--dark2)', border: '1px solid rgba(232,104,26,0.3)', borderRadius: 8,
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                  borderLeft: '3px solid #E8681A',
                }}
              >
                <div style={{ flex: '0 0 auto', minWidth: 90 }}>
                  <div style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 15, fontWeight: 800, color: '#E8681A', letterSpacing: 0.5,
                  }}>
                    {job.num}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{job.customer || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {job.type}{job.make ? ` — ${job.make}` : ''}{job.dims ? ` — ${job.dims}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', minWidth: 70, textAlign: 'right' }}>
                  {new Date(job.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/jsheet/${job.id}`)}
                    style={btnStyle('rgba(255,255,255,0.5)')}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    View Job Sheet
                  </button>
                  {job.quoteId && (
                    <button
                      onClick={() => router.push(`/quotes/builder?id=${job.quoteId}`)}
                      style={btnStyle('rgba(255,255,255,0.5)')}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      Edit Quote
                    </button>
                  )}
                  <button
                    onClick={() => approveJob(job.id)}
                    disabled={approving === job.id}
                    style={{
                      ...btnStyle('#22c55e'),
                      opacity: approving === job.id ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (approving !== job.id) { e.currentTarget.style.background = 'rgba(34,197,94,0.12)' } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {approving === job.id ? 'Approving...' : '✓ Approve for Manufacture'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && drafts.length === 0 && (
        <div style={{
          marginBottom: 28, padding: '14px 18px', borderRadius: 8,
          background: 'var(--dark2)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text3)',
        }}>
          No jobs awaiting engineering approval.
        </div>
      )}

      {loading && (
        <div style={{
          marginBottom: 28, padding: '14px 18px', borderRadius: 8,
          background: 'var(--dark2)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text3)',
        }}>
          Loading engineering queue...
        </div>
      )}

      {/* Tool Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Job Sheet Generator', icon: '📋', desc: 'Generate job sheets from accepted quotes', href: '/engineering/job-sheets' },
          { label: 'Manual Job Sheet Generator', icon: '🛠️', desc: 'Drag & drop builder — fill in fields manually and export', href: '/job-sheet-creator.html', external: true },
          { label: 'VIN Plate / EBS File / Axle Suspension Ordering', icon: '🏷️', desc: 'VIN plates, EBS files & suspension orders', href: '/engineering/vin-plates' },
          { label: 'MRP Ordering', icon: '📦', desc: 'Auto BOM resolver — select a job, get the full MRPeasy BOM list', href: '/engineering/mrp-ordering' },
          { label: 'Xero Quote Import', icon: '📥', desc: 'Drop Xero quotes CSV → parse specs → get BOMs → import to app', href: '/engineering/xero-import' },
          { label: 'VASS Booking Generator', icon: '🔧', desc: 'CVC eVASS booking requests — populate from quotes or fill manually', href: '/engineering/vass-booking' },
          { label: 'Drawings', icon: '📐', desc: 'Engineering drawings & revisions', href: '' },
        ].map((tool) => (
          <button
            key={tool.label}
            onClick={() => {
              if (!tool.href) return
              if ((tool as any).external) window.open(tool.href, '_blank')
              else router.push(tool.href)
            }}
            style={{
              ...cardStyle,
              cursor: tool.href ? 'pointer' : 'default',
              opacity: tool.href ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (tool.href) {
                e.currentTarget.style.borderColor = '#E8681A'
                e.currentTarget.style.background = 'rgba(232,104,26,0.06)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--dark2)'
            }}
          >
            <div style={{ fontSize: 28 }}>{tool.icon}</div>
            <div style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              color: '#fff', lineHeight: 1.3,
            }}>
              {tool.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
              {tool.desc}
              {!tool.href && <span style={{ display: 'block', marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Coming Soon</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
