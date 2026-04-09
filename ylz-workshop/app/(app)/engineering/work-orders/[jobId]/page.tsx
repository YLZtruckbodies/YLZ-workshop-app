'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface WorkOrderPart {
  id: string
  partName: string
  material: string
  thickness: string
  hasFlatPattern: boolean
  quantity: number
  dxfFileId: string
  pdfFileId: string
  dxfFileName: string
  pdfFileName: string
  thumbnailUrl: string
  sortOrder: number
}

interface WorkOrder {
  id: string
  jobId: string
  jobNum: string
  kitName: string
  status: string
  dxfFolderId: string
  pdfFolderId: string
  customer: string
  notes: string
  approvedBy: string
  approvedAt: string | null
  createdAt: string
  parts: WorkOrderPart[]
}

export default function WorkOrderPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<WorkOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/work-orders?jobId=${params.jobId}`)
      const orders = await res.json()
      if (Array.isArray(orders) && orders.length > 0) {
        setOrder(orders[0])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [params.jobId])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const handleQtyChange = async (partId: string, qty: number) => {
    if (!order || qty < 1) return
    // Optimistic update
    setOrder(prev => prev ? {
      ...prev,
      parts: prev.parts.map(p => p.id === partId ? { ...p, quantity: qty } : p),
    } : null)
    try {
      await fetch(`/api/work-orders/${order.id}/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      })
    } catch { /* ignore */ }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/work-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: params.jobId }),
      })
      if (res.ok) {
        setSaveMsg('Regenerated')
        await fetchOrder()
      } else {
        const err = await res.json()
        setSaveMsg(err.error || 'Failed to regenerate')
      }
    } catch {
      setSaveMsg('Failed to regenerate')
    }
    setRegenerating(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleApprove = async () => {
    if (!order) return
    setApproving(true)
    try {
      await fetch(`/api/work-orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: 'Engineering' }),
      })
      setSaveMsg('Approved')
      fetchOrder()
    } catch {
      setSaveMsg('Failed to approve')
    }
    setApproving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text3)', fontFamily: "'League Spartan', sans-serif" }}>
      Loading work order...
    </div>
  )

  if (!order) return (
    <div style={{ padding: 40, fontFamily: "'League Spartan', sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 12 }}>No Work Order Found</div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
        No auto-generated work order exists for this job yet. Work orders are created automatically when a quote is accepted and the kickoff agent finds a matching kit in Google Drive.
      </div>
      <button
        onClick={() => router.push('/engineering')}
        style={{
          fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700,
          padding: '8px 20px', borderRadius: 4, cursor: 'pointer',
          border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)',
        }}
      >
        ← Back to Engineering
      </button>
    </div>
  )

  // Group parts by material
  const groups: Record<string, WorkOrderPart[]> = {}
  for (const part of order.parts) {
    if (!groups[part.material]) groups[part.material] = []
    groups[part.material].push(part)
  }

  const statusColour = order.status === 'approved' ? '#22c55e' : order.status === 'sent' ? '#3b82f6' : '#E8681A'

  return (
    <>
      <style>{`
        @media print {
          .wo-no-print { display: none !important; }
          .wo-print-only { display: block !important; }
          body { background: #fff !important; color: #1a1a1a !important; }
          .wo-container { background: #fff !important; color: #1a1a1a !important; padding: 20px !important; }
          .wo-header { border-color: #E8681A !important; }
          .wo-material-hdr { background: #E8681A !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .wo-part-row { border-color: #ddd !important; }
          .wo-part-name { color: #1a1a1a !important; font-size: 13px !important; font-weight: 700 !important; }
          .wo-part-detail { color: #444 !important; font-size: 11px !important; }
          .wo-qty-input { border: 2px solid #333 !important; background: #fff !important; color: #1a1a1a !important; font-size: 14px !important; font-weight: 700 !important; }
          .wo-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .wo-part-row img { filter: contrast(2.5) saturate(0) brightness(0.9) !important; width: 70px !important; height: 52px !important; border: 2px solid #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .wo-part-row a { color: #1a1a1a !important; border-color: #999 !important; font-size: 9px !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      <div className="wo-container" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div className="wo-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 24, paddingBottom: 16, borderBottom: '3px solid #E8681A',
        }}>
          <div>
            <div style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 24, fontWeight: 800,
              letterSpacing: 2, textTransform: 'uppercase', color: '#fff',
            }}>
              Work Order — {order.jobNum}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginTop: 4 }}>
              {order.kitName}{order.customer ? ` — ${order.customer}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Generated {new Date(order.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
              {order.approvedAt && ` — Approved ${new Date(order.approvedAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })} by ${order.approvedBy}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="wo-no-print">
            <span className="wo-badge" style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              padding: '4px 12px', borderRadius: 4, background: statusColour, color: '#fff',
            }}>
              {order.status}
            </span>
            {saveMsg && <span style={{ fontSize: 12, fontWeight: 600, color: saveMsg === 'Approved' ? '#22d07a' : '#e84560' }}>{saveMsg}</span>}
            {order.dxfFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${order.dxfFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                }}
              >
                DXF Folder
              </a>
            )}
            {order.pdfFolderId && (
              <a
                href={`https://drive.google.com/drive/folders/${order.pdfFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                }}
              >
                PDF Folder
              </a>
            )}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)',
                opacity: regenerating ? 0.5 : 1,
              }}
            >
              {regenerating ? 'Regenerating...' : '↻ Regenerate'}
            </button>
            <button
              onClick={() => window.print()}
              style={{
                fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)',
              }}
            >
              Print / PDF
            </button>
            {order.status === 'draft' && (
              <button
                onClick={handleApprove}
                disabled={approving}
                style={{
                  fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                  padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                  opacity: approving ? 0.5 : 1,
                }}
              >
                {approving ? 'Approving...' : '✓ Approve for Cold Form'}
              </button>
            )}
            <button
              onClick={() => router.push('/engineering')}
              style={{
                fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)',
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Parts grouped by material */}
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([material, parts]) => (
          <div key={material} style={{ marginBottom: 20 }}>
            <div className="wo-material-hdr" style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 14px',
              background: '#E8681A', color: '#fff', borderRadius: '4px 4px 0 0',
            }}>
              {material} ({parts.length} part{parts.length !== 1 ? 's' : ''})
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '68px 1fr 70px 80px 80px 100px',
              padding: '6px 14px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              color: 'var(--text3)',
            }}>
              <div></div>
              <div>Part</div>
              <div style={{ textAlign: 'center' }}>Qty</div>
              <div style={{ textAlign: 'center' }}>Cutting</div>
              <div style={{ textAlign: 'center' }}>Folding</div>
              <div style={{ textAlign: 'right' }}>Files</div>
            </div>

            {/* Part rows */}
            {parts.map((part) => (
              <div
                key={part.id}
                className="wo-part-row"
                style={{
                  display: 'grid', gridTemplateColumns: '68px 1fr 70px 80px 80px 100px',
                  alignItems: 'center', padding: '10px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Thumbnail — links to DXF in Drive */}
                <div>
                  {part.thumbnailUrl ? (
                    <a
                      href={part.dxfFileId ? `https://drive.google.com/file/d/${part.dxfFileId}/view` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', cursor: part.dxfFileId ? 'pointer' : 'default' }}
                    >
                      <img
                        src={part.thumbnailUrl}
                        alt={part.partName}
                        style={{
                          width: 56, height: 42, objectFit: 'contain', borderRadius: 2,
                          background: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                          filter: 'contrast(1.8) saturate(0)',
                        }}
                      />
                    </a>
                  ) : (
                    <div style={{
                      width: 56, height: 42, borderRadius: 2, background: 'var(--dark2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: 'var(--text3)',
                    }}>
                      📄
                    </div>
                  )}
                </div>

                {/* Part name */}
                <div>
                  <div className="wo-part-name" style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {part.partName}
                  </div>
                  <div className="wo-part-detail" style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {part.thickness || material}
                  </div>
                </div>

                {/* Qty */}
                <div style={{ textAlign: 'center' }}>
                  <input
                    className="wo-qty-input"
                    type="number"
                    min={1}
                    value={part.quantity}
                    onChange={(e) => handleQtyChange(part.id, parseInt(e.target.value) || 1)}
                    disabled={order.status !== 'draft'}
                    style={{
                      width: 48, textAlign: 'center', padding: '4px 6px', borderRadius: 3,
                      border: '1px solid var(--border)', background: 'var(--dark2)', color: '#fff',
                      fontSize: 13, fontWeight: 600,
                    }}
                  />
                </div>

                {/* Cutting */}
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                  ☐ Cut
                </div>

                {/* Folding */}
                <div style={{ textAlign: 'center', fontSize: 12, color: part.hasFlatPattern ? '#fff' : 'var(--text3)' }}>
                  {part.hasFlatPattern ? '☐ Fold' : '—'}
                </div>

                {/* File links */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  {part.dxfFileId && (
                    <a
                      href={`https://drive.google.com/file/d/${part.dxfFileId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 3,
                        border: '1px solid rgba(59,130,246,0.4)', color: '#3b82f6',
                        textDecoration: 'none',
                      }}
                    >
                      DXF
                    </a>
                  )}
                  {part.pdfFileId && (
                    <a
                      href={`https://drive.google.com/file/d/${part.pdfFileId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 3,
                        border: '1px solid rgba(232,104,26,0.4)', color: '#E8681A',
                        textDecoration: 'none',
                      }}
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Summary */}
        <div style={{
          marginTop: 16, padding: '12px 14px', background: 'var(--dark2)',
          borderRadius: 4, border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text3)',
        }}>
          {order.parts.length} part{order.parts.length !== 1 ? 's' : ''} total
          — {Object.keys(groups).length} material group{Object.keys(groups).length !== 1 ? 's' : ''}
          — Total qty: {order.parts.reduce((sum, p) => sum + p.quantity, 0)}
        </div>
      </div>
    </>
  )
}
