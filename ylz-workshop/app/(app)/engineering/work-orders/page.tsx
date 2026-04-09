'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface WorkOrder {
  id: string
  jobId: string
  jobNum: string
  kitName: string
  status: string
  customer: string
  createdAt: string
  approvedAt: string | null
  approvedBy: string
  parts: { id: string }[]
}

export default function WorkOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/work-orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const statusColour = (s: string) => s === 'approved' ? '#22c55e' : s === 'sent' ? '#3b82f6' : '#E8681A'

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Cold Form Work Orders
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Auto-generated from kit DXF/PDF files when jobs are kicked off.
        </div>
      </div>

      {loading && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading...</div>}

      {!loading && orders.length === 0 && (
        <div style={{
          padding: '14px 18px', borderRadius: 8, background: 'var(--dark2)',
          border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)',
        }}>
          No work orders yet. Work orders are created automatically when a quote is accepted and the kickoff agent finds a matching kit in Google Drive.
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map((wo) => (
            <div
              key={wo.id}
              onClick={() => router.push(`/engineering/work-orders/${wo.jobId}`)}
              style={{
                background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'border-color 0.15s',
                borderLeft: `3px solid ${statusColour(wo.status)}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8681A' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.borderLeftColor = statusColour(wo.status) }}
            >
              <div style={{ flex: '0 0 90px' }}>
                <div style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 15, fontWeight: 800, color: '#E8681A', letterSpacing: 0.5,
                }}>
                  {wo.jobNum}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{wo.kitName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {wo.customer || '—'} — {wo.parts.length} part{wo.parts.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 3, background: statusColour(wo.status), color: '#fff',
              }}>
                {wo.status}
              </span>
              <div style={{ fontSize: 10, color: 'var(--text3)', minWidth: 70, textAlign: 'right' }}>
                {new Date(wo.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
