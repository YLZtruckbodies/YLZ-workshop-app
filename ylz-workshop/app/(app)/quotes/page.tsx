'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  customerName: string
  dealerName: string
  buildType: string
  total: number
  overridePrice: number | null
  preparedBy: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.15)' },
  sent: { bg: 'rgba(59,130,246,0.1)', text: 'rgba(59,130,246,0.9)', border: 'rgba(59,130,246,0.3)' },
  accepted: { bg: 'rgba(34,197,94,0.1)', text: 'rgba(34,197,94,0.9)', border: 'rgba(34,197,94,0.3)' },
  declined: { bg: 'rgba(239,68,68,0.1)', text: 'rgba(239,68,68,0.9)', border: 'rgba(239,68,68,0.3)' },
  expired: { bg: 'rgba(234,179,8,0.1)', text: 'rgba(234,179,8,0.9)', border: 'rgba(234,179,8,0.3)' },
}

export default function QuotesPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchQuotes()
  }, [filter])

  async function fetchQuotes() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/quotes?${params}`)
      const data = await res.json()
      setQuotes(data)
    } catch {
      // silent
    }
    setLoading(false)
  }

  function fmt(num: number) {
    return num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
          }}>
            Quotes
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Create, manage, and track customer quotes.
          </div>
        </div>
        <button
          onClick={() => router.push('/quotes/builder')}
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '12px 24px',
            borderRadius: 8,
            cursor: 'pointer',
            border: 'none',
            background: '#E8681A',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ff7a2e' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#E8681A' }}
        >
          + New Quote
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'draft', 'sent', 'accepted', 'declined', 'expired'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              border: `1px solid ${filter === s ? '#E8681A' : 'var(--border)'}`,
              background: filter === s ? 'rgba(232,104,26,0.15)' : 'transparent',
              color: filter === s ? '#E8681A' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Quotes Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
      ) : quotes.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No quotes yet</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Create your first quote to get started</div>
          <button
            onClick={() => router.push('/quotes/builder')}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              padding: '10px 20px',
              borderRadius: 6,
              cursor: 'pointer',
              border: 'none',
              background: '#E8681A',
              color: '#fff',
            }}
          >
            + Create Quote
          </button>
        </div>
      ) : (
        <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 150px 120px 120px 100px 80px',
            gap: 16,
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--text3)',
          }}>
            <span>Quote #</span>
            <span>Customer</span>
            <span>Build Type</span>
            <span>Total (ex GST)</span>
            <span>Prepared By</span>
            <span>Status</span>
            <span>Date</span>
          </div>

          {/* Table rows */}
          {quotes.map((q) => {
            const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft
            const effectiveTotal = q.overridePrice || q.total
            return (
              <div
                key={q.id}
                onClick={() => router.push(`/quotes/builder?id=${q.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 150px 120px 120px 100px 80px',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontWeight: 700, color: '#E8681A' }}>{q.quoteNumber}</span>
                <span style={{ fontWeight: 500 }}>{q.customerName}</span>
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>{q.buildType}</span>
                <span style={{ fontWeight: 600, fontFamily: "'League Spartan', sans-serif" }}>
                  ${fmt(effectiveTotal)}
                </span>
                <span style={{ color: 'var(--text3)' }}>{q.preparedBy}</span>
                <span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 4,
                    background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                  }}>
                    {q.status}
                  </span>
                </span>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>
                  {new Date(q.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
