'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RecentQuote {
  id: string
  quoteNumber: string
  status: string
  total: number
  buildType: string
  createdAt: string
}

interface Customer {
  customerName: string
  dealerName: string
  quoteCount: number
  acceptedCount: number
  totalValue: number
  acceptedValue: number
  buildTypes: string[]
  winRate: number
  lastQuoteAt: string
  recentQuotes: RecentQuote[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'rgba(255,255,255,0.4)',
  sent: 'rgba(59,130,246,0.9)',
  accepted: 'rgba(34,197,94,0.9)',
  declined: 'rgba(239,68,68,0.9)',
  expired: 'rgba(234,179,8,0.9)',
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => { setCustomers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter((c) =>
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    c.dealerName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
          }}>
            Customers
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Quote history and win rates by customer
          </div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6, color: '#fff', fontSize: 13, padding: '8px 14px',
            outline: 'none', width: 220,
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No customers found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((c) => {
            const isExpanded = expanded === c.customerName
            return (
              <div
                key={c.customerName}
                style={{
                  background: '#111', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : c.customerName)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 100px 100px 80px 30px',
                    gap: 16, padding: '16px 20px',
                    alignItems: 'center', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'rgba(232,104,26,0.3)' }}
                  onMouseLeave={(e) => { (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <div>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      {c.customerName}
                    </div>
                    {c.dealerName && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>via {c.dealerName}</div>
                    )}
                    {c.buildTypes.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {c.buildTypes.map((bt) => (
                          <span key={bt} style={{
                            fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            {bt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 16, fontWeight: 700, color: '#E8681A' }}>
                      {c.quoteCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>quotes</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                      {c.acceptedCount}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>accepted</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: "'League Spartan', sans-serif", fontSize: 16, fontWeight: 800,
                      color: c.winRate >= 50 ? '#22c55e' : c.winRate >= 25 ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                    }}>
                      {c.winRate}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>win rate</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff' }}>
                      ${fmt(c.acceptedValue)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>accepted value</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text3)' }}>
                    {new Date(c.lastQuoteAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded quotes */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px 16px', background: '#0a0a0a' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>
                      Recent Quotes
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {c.recentQuotes.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => router.push(`/quotes/builder?id=${q.id}`)}
                          style={{
                            display: 'grid', gridTemplateColumns: '100px 1fr 120px 80px',
                            gap: 12, padding: '8px 12px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                            transition: 'background 0.1s', alignItems: 'center',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                        >
                          <span style={{ fontWeight: 700, color: '#E8681A', fontSize: 12 }}>{q.quoteNumber}</span>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{q.buildType}</span>
                          <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 600, color: '#fff' }}>
                            ${fmt(q.total)}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                            padding: '2px 6px', borderRadius: 3,
                            color: STATUS_COLORS[q.status] || 'rgba(255,255,255,0.4)',
                            background: `${STATUS_COLORS[q.status] || 'rgba(255,255,255,0.4)'}18`,
                          }}>
                            {q.status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push(`/quotes/new`)}
                      style={{
                        marginTop: 12, fontSize: 11, fontWeight: 700,
                        padding: '6px 14px', borderRadius: 4,
                        background: 'rgba(232,104,26,0.12)', border: '1px solid rgba(232,104,26,0.3)',
                        color: '#E8681A', cursor: 'pointer',
                      }}
                    >
                      + New Quote for {c.customerName}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
