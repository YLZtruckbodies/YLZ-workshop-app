'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Quote {
  id: string
  quoteNumber: string
  customerName: string
  dealerName: string
  buildType: string
  status: string
  total: number
  overridePrice: number | null
  createdAt: string
  jobId: string | null
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:    { bg: 'rgba(255,255,255,0.07)', text: 'rgba(255,255,255,0.4)' },
  sent:     { bg: 'rgba(59,130,246,0.15)', text: 'rgba(59,130,246,0.9)' },
  accepted: { bg: 'rgba(34,197,94,0.15)',  text: 'rgba(34,197,94,0.9)' },
  declined: { bg: 'rgba(239,68,68,0.15)',  text: 'rgba(239,68,68,0.7)' },
  expired:  { bg: 'rgba(234,179,8,0.15)',  text: 'rgba(234,179,8,0.8)' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function JobSheetsPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('accepted')

  useEffect(() => {
    fetch('/api/quotes')
      .then((r) => r.json())
      .then((data) => { setQuotes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = quotes.filter((q) => {
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    const s = search.toLowerCase()
    const matchSearch = !s ||
      q.quoteNumber.toLowerCase().includes(s) ||
      q.customerName.toLowerCase().includes(s) ||
      q.dealerName.toLowerCase().includes(s) ||
      q.buildType.toLowerCase().includes(s)
    return matchStatus && matchSearch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push('/engineering')}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A'; e.currentTarget.style.color = '#E8681A' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            ← Engineering
          </button>
        </div>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Job Sheet Creator
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, marginBottom: 20 }}>
          Generate job sheets for accepted quotes — use the filter to view other statuses.
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes, customers, build type…"
            style={{
              flex: 1, maxWidth: 400,
              background: '#111', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, cursor: 'pointer',
            }}
          >
            <option value="all">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="sent">Sent</option>
            <option value="draft">Draft</option>
          </select>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
            {filtered.length} quote{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {loading ? (
          <div style={{ padding: 40, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Loading quotes…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {search || statusFilter !== 'all' ? 'No quotes match your filters.' : 'No quotes yet. Create one in the Quotes section.'}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '130px 1fr 200px 100px 110px 1fr',
              gap: 12, padding: '8px 12px',
              fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4,
            }}>
              <span>Quote #</span>
              <span>Customer</span>
              <span>Build Type</span>
              <span>Status</span>
              <span>Date</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {filtered.map((q) => {
              const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
              const price = q.overridePrice ?? q.total
              return (
                <div
                  key={q.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 200px 100px 110px 1fr',
                    gap: 12, padding: '12px 12px', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {q.quoteNumber}
                    </div>
                    {q.jobId && (
                      <div style={{ fontSize: 10, color: '#E8681A', marginTop: 2 }}>✓ Job linked</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{q.customerName}</div>
                    {q.dealerName && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>via {q.dealerName}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{q.buildType}</div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 4, background: sc.bg, color: sc.text,
                    }}>
                      {q.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{fmtDate(q.createdAt)}</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => window.open(q.jobId ? `/jsheet/${q.jobId}` : `/job-sheet-creator.html?quoteId=${q.id}`, '_blank')}
                      style={{
                        fontFamily: "'League Spartan', sans-serif",
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                        padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                        border: '1px solid #E8681A', background: 'rgba(232,104,26,0.12)', color: '#E8681A',
                      }}
                    >
                      📋 Job Sheet
                    </button>
                    <button
                      onClick={() => window.open(`/qpdf/${q.id}`, '_blank')}
                      style={{
                        fontFamily: "'League Spartan', sans-serif",
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                        padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Quote PDF
                    </button>
                    <button
                      onClick={() => router.push(`/quotes/builder?id=${q.id}`)}
                      style={{
                        fontFamily: "'League Spartan', sans-serif",
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                        padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
