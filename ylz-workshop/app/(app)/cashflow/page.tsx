'use client'

import { useSession } from 'next-auth/react'
import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'rgba(255,255,255,0.15)' },
  { value: 'deposit-paid', label: 'Deposit Paid', color: '#3b9de8' },
  { value: 'invoiced', label: 'Invoiced', color: '#f5a623' },
  { value: 'paid', label: 'Paid', color: '#22d07a' },
  { value: 'overdue', label: 'Overdue', color: '#e84560' },
]

function statusColor(status: string): string {
  return PAYMENT_STATUSES.find((s) => s.value === status)?.color || 'rgba(255,255,255,0.15)'
}

function statusLabel(status: string): string {
  return PAYMENT_STATUSES.find((s) => s.value === status)?.label || status
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export default function CashflowDeliveriesPage() {
  const { data: session } = useSession()
  const { data, mutate } = useSWR('/api/deliveries', fetcher, { refreshInterval: 15000 })
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [approving, setApproving] = useState<string | null>(null)
  const [tab, setTab] = useState<'qc' | 'finished' | 'dispatched'>('qc')

  const user = session?.user as any
  const canEdit = user?.canEdit || user?.fullAdmin

  const merged = useMemo(() => data?.merged || [], [data])

  const qcJobs = useMemo(() => merged.filter((m: any) => m.job.stage === 'QC'), [merged])
  const finishedJobs = useMemo(() => merged.filter((m: any) => m.job.prodGroup === 'finished' && m.job.stage !== 'QC' && m.job.stage !== 'Dispatch'), [merged])
  const dispatchedJobs = useMemo(() => merged.filter((m: any) => m.job.stage === 'Dispatch'), [merged])

  const totals = useMemo(() => {
    const all = data?.deliveries || []
    let total = 0, depositsReceived = 0, invoiced = 0, paid = 0, outstanding = 0
    for (const d of all) {
      total += d.invoiceAmount || 0
      if (d.depositPaid) depositsReceived += d.depositAmount || 0
      if (d.paymentStatus === 'invoiced' || d.paymentStatus === 'overdue') invoiced += d.invoiceAmount || 0
      if (d.paymentStatus === 'paid') paid += d.invoiceAmount || 0
      if (d.paymentStatus !== 'paid') outstanding += (d.invoiceAmount || 0) - (d.depositPaid ? (d.depositAmount || 0) : 0)
    }
    return { total, depositsReceived, invoiced, paid, outstanding }
  }, [data])

  const startEdit = (jobId: string, delivery: any) => {
    setEditingJobId(jobId)
    setEditData({
      invoiceNum: delivery?.invoiceNum || '',
      invoiceAmount: delivery?.invoiceAmount || 0,
      depositAmount: delivery?.depositAmount || 0,
      depositPaid: delivery?.depositPaid || false,
      deliveryDate: delivery?.deliveryDate || '',
      paymentDue: delivery?.paymentDue || '',
      paymentStatus: delivery?.paymentStatus || 'pending',
      notes: delivery?.notes || '',
    })
  }

  const saveDetails = useCallback(async (jobId: string, jobNum: string, customer: string, type: string) => {
    await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        jobNum,
        customer,
        type,
        ...editData,
        invoiceAmount: parseFloat(editData.invoiceAmount) || 0,
        depositAmount: parseFloat(editData.depositAmount) || 0,
      }),
    })
    mutate()
    setEditingJobId(null)
  }, [editData, mutate])

  const handleApprove = useCallback(async (jobId: string, jobNum: string, customer: string, type: string, delivery: any) => {
    if (!confirm(`Approve ${jobNum} and move to Dispatch?`)) return
    setApproving(jobId)
    await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approve: true,
        jobId,
        jobNum: delivery?.jobNum || jobNum,
        customer: delivery?.customer || customer,
        type: delivery?.type || type,
        invoiceNum: delivery?.invoiceNum || '',
        invoiceAmount: delivery?.invoiceAmount || 0,
        depositAmount: delivery?.depositAmount || 0,
        depositPaid: delivery?.depositPaid || false,
        deliveryDate: delivery?.deliveryDate || '',
        paymentDue: delivery?.paymentDue || '',
        notes: delivery?.notes || '',
      }),
    })
    mutate()
    setApproving(null)
  }, [mutate])

  const updatePaymentStatus = useCallback(async (deliveryId: string, newStatus: string) => {
    await fetch(`/api/deliveries/${deliveryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: newStatus }),
    })
    mutate()
  }, [mutate])

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Cashflow & Deliveries
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Jobs automatically appear here when they reach QC. Approve to move to Dispatch.
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Value', value: formatCurrency(totals.total), color: '#fff' },
          { label: 'Deposits Received', value: formatCurrency(totals.depositsReceived), color: '#3b9de8' },
          { label: 'Invoiced', value: formatCurrency(totals.invoiced), color: '#f5a623' },
          { label: 'Paid', value: formatCurrency(totals.paid), color: '#22d07a' },
          { label: 'Outstanding', value: formatCurrency(totals.outstanding), color: '#e84560' },
        ].map((card) => (
          <div key={card.label} style={{
            background: 'var(--surface1)', border: '1px solid var(--border2)', borderRadius: 6, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: "'League Spartan', sans-serif" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button onClick={() => setTab('qc')} style={tabStyle(tab === 'qc')}>
          Awaiting Approval ({qcJobs.length})
        </button>
        <button onClick={() => setTab('finished')} style={tabStyle(tab === 'finished')}>
          Finished / Ready to Invoice ({finishedJobs.length})
        </button>
        <button onClick={() => setTab('dispatched')} style={tabStyle(tab === 'dispatched')}>
          Dispatched / Delivered ({dispatchedJobs.length})
        </button>
      </div>

      {/* QC - Awaiting Approval */}
      {tab === 'qc' && (
        <div style={{ background: 'var(--surface1)', border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
          {qcJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No jobs in QC right now. Jobs will appear here automatically when they reach QC stage.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    {['Job', 'Customer', 'Type', 'Invoice #', 'Invoice Amt', 'Deposit', 'Dep. Paid', 'Delivery', 'Payment Due', 'Notes', 'Actions'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {qcJobs.map(({ job, delivery }: any) => {
                    const isEditing = editingJobId === job.id
                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={cellStyle}>
                          <span style={{ color: '#E8681A', fontWeight: 700, fontSize: 14 }}>{job.num}</span>
                          <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>IN QC</div>
                        </td>
                        <td style={cellStyle}>{job.customer || '\u2014'}</td>
                        <td style={cellStyle}><span style={{ fontSize: 12, color: 'var(--text2)' }}>{job.type}</span></td>
                        {isEditing ? (
                          <>
                            <td style={cellStyle}><input value={editData.invoiceNum} onChange={(e) => setEditData({ ...editData, invoiceNum: e.target.value })} style={editInputStyle} placeholder="INV-001" /></td>
                            <td style={cellStyle}><input type="number" value={editData.invoiceAmount || ''} onChange={(e) => setEditData({ ...editData, invoiceAmount: e.target.value })} style={editInputStyle} placeholder="0" /></td>
                            <td style={cellStyle}><input type="number" value={editData.depositAmount || ''} onChange={(e) => setEditData({ ...editData, depositAmount: e.target.value })} style={editInputStyle} placeholder="0" /></td>
                            <td style={cellStyle}><input type="checkbox" checked={editData.depositPaid} onChange={(e) => setEditData({ ...editData, depositPaid: e.target.checked })} /></td>
                            <td style={cellStyle}><input value={editData.deliveryDate} onChange={(e) => setEditData({ ...editData, deliveryDate: e.target.value })} style={editInputStyle} placeholder="dd/mm/yy" /></td>
                            <td style={cellStyle}><input value={editData.paymentDue} onChange={(e) => setEditData({ ...editData, paymentDue: e.target.value })} style={editInputStyle} placeholder="dd/mm/yy" /></td>
                            <td style={cellStyle}><input value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} style={editInputStyle} placeholder="Notes" /></td>
                            <td style={cellStyle}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button onClick={() => saveDetails(job.id, job.num, job.customer, job.type)} style={btnStyle('#22d07a')}>Save</button>
                                <button onClick={() => setEditingJobId(null)} style={btnStyle('var(--text3)')}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={cellStyle}>{delivery?.invoiceNum || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={{ ...cellStyle, fontWeight: 600 }}>{delivery?.invoiceAmount ? formatCurrency(delivery.invoiceAmount) : <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}>{delivery?.depositAmount ? formatCurrency(delivery.depositAmount) : <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}><Pill yes={delivery?.depositPaid} /></td>
                            <td style={cellStyle}>{delivery?.deliveryDate || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}>{delivery?.paymentDue || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={{ ...cellStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ color: 'var(--text3)' }}>{delivery?.notes || '\u2014'}</span>
                            </td>
                            <td style={cellStyle}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {canEdit && (
                                  <button onClick={() => startEdit(job.id, delivery)} style={btnStyle('#3b9de8')}>
                                    {delivery ? 'Edit' : 'Add Details'}
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => handleApprove(job.id, job.num, job.customer, job.type, delivery)}
                                    disabled={approving === job.id}
                                    style={{
                                      ...btnStyle('#22d07a'),
                                      background: '#22d07a',
                                      color: '#000',
                                      fontWeight: 800,
                                      opacity: approving === job.id ? 0.5 : 1,
                                    }}
                                  >
                                    {approving === job.id ? '...' : 'Approve'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Finished / Ready to Invoice */}
      {tab === 'finished' && (
        <div style={{ background: 'var(--surface1)', border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
          {finishedJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No finished jobs waiting to be invoiced. Jobs appear here when moved to the &quot;Finished / Ready to Invoice&quot; group on the job board.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    {['Job', 'Customer', 'Type', 'Stage', 'Invoice #', 'Invoice Amt', 'Deposit', 'Dep. Paid', 'Delivery', 'Payment Due', 'Notes', 'Actions'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finishedJobs.map(({ job, delivery }: any) => {
                    const isEditing = editingJobId === job.id
                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={cellStyle}>
                          <span style={{ color: '#22d07a', fontWeight: 700, fontSize: 14 }}>{job.num}</span>
                          <div style={{ fontSize: 10, color: '#22d07a', fontWeight: 600, marginTop: 2 }}>FINISHED</div>
                        </td>
                        <td style={cellStyle}>{job.customer || '\u2014'}</td>
                        <td style={cellStyle}><span style={{ fontSize: 12, color: 'var(--text2)' }}>{job.type}</span></td>
                        <td style={cellStyle}><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{job.stage}</span></td>
                        {isEditing ? (
                          <>
                            <td style={cellStyle}><input value={editData.invoiceNum} onChange={(e) => setEditData({ ...editData, invoiceNum: e.target.value })} style={editInputStyle} placeholder="INV-001" /></td>
                            <td style={cellStyle}><input type="number" value={editData.invoiceAmount || ''} onChange={(e) => setEditData({ ...editData, invoiceAmount: e.target.value })} style={editInputStyle} placeholder="0" /></td>
                            <td style={cellStyle}><input type="number" value={editData.depositAmount || ''} onChange={(e) => setEditData({ ...editData, depositAmount: e.target.value })} style={editInputStyle} placeholder="0" /></td>
                            <td style={cellStyle}><input type="checkbox" checked={editData.depositPaid} onChange={(e) => setEditData({ ...editData, depositPaid: e.target.checked })} /></td>
                            <td style={cellStyle}><input value={editData.deliveryDate} onChange={(e) => setEditData({ ...editData, deliveryDate: e.target.value })} style={editInputStyle} placeholder="dd/mm/yy" /></td>
                            <td style={cellStyle}><input value={editData.paymentDue} onChange={(e) => setEditData({ ...editData, paymentDue: e.target.value })} style={editInputStyle} placeholder="dd/mm/yy" /></td>
                            <td style={cellStyle}><input value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} style={editInputStyle} placeholder="Notes" /></td>
                            <td style={cellStyle}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => saveDetails(job.id, job.num, job.customer, job.type)} style={btnStyle('#22d07a')}>Save</button>
                                <button onClick={() => setEditingJobId(null)} style={btnStyle('var(--text3)')}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={cellStyle}>{delivery?.invoiceNum || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={{ ...cellStyle, fontWeight: 600 }}>{delivery?.invoiceAmount ? formatCurrency(delivery.invoiceAmount) : <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}>{delivery?.depositAmount ? formatCurrency(delivery.depositAmount) : <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}><Pill yes={delivery?.depositPaid} /></td>
                            <td style={cellStyle}>{delivery?.deliveryDate || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={cellStyle}>{delivery?.paymentDue || <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>}</td>
                            <td style={{ ...cellStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <span style={{ color: 'var(--text3)' }}>{delivery?.notes || '\u2014'}</span>
                            </td>
                            <td style={cellStyle}>
                              {canEdit && (
                                <button onClick={() => startEdit(job.id, delivery)} style={btnStyle('#3b9de8')}>
                                  {delivery ? 'Edit' : 'Add Details'}
                                </button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dispatched / Delivered */}
      {tab === 'dispatched' && (
        <div style={{ background: 'var(--surface1)', border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
          {dispatchedJobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No dispatched jobs yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                    {['Job', 'Customer', 'Type', 'Invoice #', 'Invoice Amt', 'Deposit', 'Delivery', 'Payment Status', 'Payment Due', 'Notes'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dispatchedJobs.map(({ job, delivery }: any) => (
                    <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={cellStyle}>
                        <span style={{ color: '#22d07a', fontWeight: 700, fontSize: 14 }}>{job.num}</span>
                        <div style={{ fontSize: 10, color: '#22d07a', fontWeight: 600, marginTop: 2 }}>DISPATCHED</div>
                      </td>
                      <td style={cellStyle}>{job.customer || '\u2014'}</td>
                      <td style={cellStyle}><span style={{ fontSize: 12, color: 'var(--text2)' }}>{job.type}</span></td>
                      <td style={cellStyle}>{delivery?.invoiceNum || '\u2014'}</td>
                      <td style={{ ...cellStyle, fontWeight: 600 }}>{delivery?.invoiceAmount ? formatCurrency(delivery.invoiceAmount) : '\u2014'}</td>
                      <td style={cellStyle}>{delivery?.depositAmount ? formatCurrency(delivery.depositAmount) : '\u2014'}</td>
                      <td style={cellStyle}>{delivery?.deliveryDate || '\u2014'}</td>
                      <td style={cellStyle}>
                        {delivery ? (
                          <span
                            style={{
                              display: 'inline-block', padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                              background: `${statusColor(delivery.paymentStatus)}22`, color: statusColor(delivery.paymentStatus),
                              cursor: canEdit ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                              if (!canEdit) return
                              const idx = PAYMENT_STATUSES.findIndex((s) => s.value === delivery.paymentStatus)
                              const next = PAYMENT_STATUSES[(idx + 1) % PAYMENT_STATUSES.length].value
                              updatePaymentStatus(delivery.id, next)
                            }}
                          >
                            {statusLabel(delivery.paymentStatus)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>
                        )}
                      </td>
                      <td style={cellStyle}>{delivery?.paymentDue || '\u2014'}</td>
                      <td style={{ ...cellStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: 'var(--text3)' }}>{delivery?.notes || '\u2014'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ yes }: { yes?: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
      background: yes ? 'rgba(34,208,122,0.15)' : 'rgba(255,255,255,0.06)',
      color: yes ? '#22d07a' : 'var(--text3)',
    }}>
      {yes ? 'Yes' : 'No'}
    </span>
  )
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    padding: '10px 20px', borderRadius: 4, cursor: 'pointer', minHeight: 44,
    border: active ? '1.5px solid #fff' : '1.5px solid var(--border2)',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? '#fff' : 'var(--text3)',
  }
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap',
}

const cellStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: '#fff', whiteSpace: 'nowrap',
}

const editInputStyle: React.CSSProperties = {
  background: 'var(--surface3)', border: '1px solid rgba(232,104,26,0.4)',
  borderRadius: 3, padding: '6px 8px', color: '#fff', fontSize: 12, width: '100%', outline: 'none', minWidth: 70,
}

function btnStyle(color: string): React.CSSProperties {
  return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
    border: `1px solid ${color}`, background: 'transparent', color, minHeight: 32, whiteSpace: 'nowrap',
  }
}
