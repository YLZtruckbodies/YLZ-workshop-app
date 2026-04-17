'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

const BUILD_TYPE_LABELS: Record<string, string> = {
  'truck-body': 'Truck Body',
  'trailer': 'Trailer',
  'truck-and-trailer': 'Truck + Trailer',
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
  const [copying, setCopying] = useState<string | null>(null)
  const [statusMenu, setStatusMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!statusMenu) return
    const close = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setStatusMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [statusMenu])

  async function handleStatusChange(quoteId: string, newStatus: string) {
    setUpdatingStatus(quoteId)
    setStatusMenu(null)
    // Optimistic update
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'sent' ? { sentAt: new Date().toISOString() } : {}) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || `Failed to update status`)
        await fetchQuotes() // revert to actual DB state
      }
    } catch {
      await fetchQuotes()
    }
    setUpdatingStatus(null)
  }

  async function handleCopy(e: React.MouseEvent, quoteId: string) {
    e.stopPropagation()
    setCopying(quoteId)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/copy`, { method: 'POST' })
      const data = await res.json()
      if (data.id) {
        await fetchQuotes()
        router.push(`/quotes/builder?id=${data.id}`)
      }
    } catch {}
    setCopying(null)
  }

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
      if (Array.isArray(data)) setQuotes(data)
    } catch {
      // silent — keep current quotes state
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => window.open('/dealer-flyer-generator.html', '_blank')}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'var(--text2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            Dealer Flyer
          </button>
          <button
            onClick={() => router.push('/quotes/new')}
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
            onClick={() => router.push('/quotes/new')}
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
            const isFollowUp = q.status === 'sent' && q.sentAt
              ? (Date.now() - new Date(q.sentAt).getTime()) > 7 * 24 * 60 * 60 * 1000
              : false
            return (
              <div
                key={q.id}
                onClick={() => router.push(`/quotes/builder?id=${q.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 150px 120px 120px 100px 80px 90px',
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
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>{BUILD_TYPE_LABELS[q.buildType] || q.buildType}</span>
                <span style={{ fontWeight: 600, fontFamily: "'League Spartan', sans-serif" }}>
                  ${fmt(effectiveTotal)}
                </span>
                <span style={{ color: 'var(--text3)' }}>{q.preparedBy}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      setStatusMenu(statusMenu?.id === q.id ? null : { id: q.id, x: rect.left, y: rect.bottom + 4 })
                    }}
                    title="Click to change status"
                    style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                      background: updatingStatus === q.id ? 'rgba(255,255,255,0.06)' : sc.bg,
                      color: updatingStatus === q.id ? 'var(--text3)' : sc.text,
                      border: `1px solid ${statusMenu?.id === q.id ? sc.text : sc.border}`,
                      transition: '0.1s',
                    }}
                  >
                    {updatingStatus === q.id ? '…' : q.status}
                  </span>
                  {isFollowUp && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 3,
                      background: 'rgba(234,179,8,0.15)', color: '#eab308',
                      border: '1px solid rgba(234,179,8,0.3)',
                    }}>
                      Follow Up
                    </span>
                  )}
                </span>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>
                  {new Date(q.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                </span>
                <span>
                  <button
                    onClick={(e) => handleCopy(e, q.id)}
                    disabled={copying === q.id}
                    title="Copy to new quote"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border2)',
                      borderRadius: 4,
                      color: copying === q.id ? 'var(--text3)' : 'var(--text2)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      cursor: copying === q.id ? 'default' : 'pointer',
                      letterSpacing: 0.3,
                      transition: '0.15s',
                    }}
                    onMouseEnter={(e) => { if (copying !== q.id) { e.currentTarget.style.borderColor = '#E8681A'; e.currentTarget.style.color = '#E8681A' } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
                  >
                    {copying === q.id ? '...' : 'Copy'}
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Status change dropdown */}
      {statusMenu && (
        <div
          ref={statusMenuRef}
          style={{
            position: 'fixed', left: statusMenu.x, top: statusMenu.y, zIndex: 9999,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: 4, minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
          }}
        >
          <div style={{ padding: '4px 10px 6px', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Change Status
          </div>
          {(['draft', 'sent', 'accepted', 'declined', 'expired'] as const).map((s) => {
            const c = STATUS_COLORS[s]
            const current = quotes.find((q) => q.id === statusMenu.id)?.status === s
            return (
              <div
                key={s}
                onClick={() => !current && handleStatusChange(statusMenu.id, s)}
                style={{
                  padding: '8px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  textTransform: 'uppercase', borderRadius: 3, cursor: current ? 'default' : 'pointer',
                  color: c.text, background: current ? c.bg : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, transition: '0.1s',
                  opacity: current ? 1 : 0.8,
                }}
                onMouseEnter={(e) => { if (!current) e.currentTarget.style.background = c.bg }}
                onMouseLeave={(e) => { if (!current) e.currentTarget.style.background = 'transparent' }}
              >
                {s}
                {current && <span style={{ marginLeft: 'auto', color: '#E8681A', fontSize: 12 }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
