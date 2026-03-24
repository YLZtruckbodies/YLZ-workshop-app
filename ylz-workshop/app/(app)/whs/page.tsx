'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useWorkers } from '@/lib/hooks'

type FormType = 'injury' | 'audit' | 'nearmiss' | 'timeoff'

const FORM_LABELS: Record<FormType, string> = {
  injury: 'Injury / Incident Report',
  audit:  'WHS Audit',
  nearmiss: 'Near Miss Report',
  timeoff:  'Time Off Request',
}

const FORM_ICONS: Record<FormType, string> = {
  injury:   '🩹',
  audit:    '📋',
  nearmiss: '⚠️',
  timeoff:  '🗓',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  open:     { bg: 'rgba(239,68,68,0.1)',   text: 'rgba(239,68,68,0.9)',   border: 'rgba(239,68,68,0.3)' },
  closed:   { bg: 'rgba(34,197,94,0.1)',   text: 'rgba(34,197,94,0.9)',   border: 'rgba(34,197,94,0.3)' },
  pending:  { bg: 'rgba(234,179,8,0.1)',   text: 'rgba(234,179,8,0.9)',   border: 'rgba(234,179,8,0.3)' },
  approved: { bg: 'rgba(34,197,94,0.1)',   text: 'rgba(34,197,94,0.9)',   border: 'rgba(34,197,94,0.3)' },
  declined: { bg: 'rgba(239,68,68,0.1)',   text: 'rgba(239,68,68,0.9)',   border: 'rgba(239,68,68,0.3)' },
}

function todayStr() {
  const d = new Date()
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear().toString().slice(-2)}`
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--dark3)',
  border: '1px solid var(--border2)',
  borderRadius: 4,
  color: '#fff',
  fontSize: 13,
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 5,
}

const checkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  background: 'var(--dark3)',
  border: '1px solid var(--border2)',
  borderRadius: 4,
  cursor: 'pointer',
  userSelect: 'none',
}

export default function WhsPage() {
  const { data: session } = useSession()
  const { data: workers } = useWorkers()
  const [activeType, setActiveType] = useState<FormType>('injury')
  const [showForm, setShowForm] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState<Record<string, any>>({})

  function resetForm() {
    const user = (session?.user as any)?.name || ''
    if (activeType === 'injury') {
      setForm({ date: todayStr(), workerName: '', description: '', bodyPart: '', treatmentRequired: false, medicalAttention: false, lostTime: false, actionTaken: '', reportedBy: user, status: 'open' })
    } else if (activeType === 'audit') {
      setForm({ date: todayStr(), conductedBy: user, area: '', findings: '', actionsRequired: '', score: 0, status: 'open' })
    } else if (activeType === 'nearmiss') {
      setForm({ date: todayStr(), reportedBy: user, location: '', description: '', potentialInjury: '', actionTaken: '', status: 'open' })
    } else if (activeType === 'timeoff') {
      setForm({ workerName: '', startDate: todayStr(), endDate: '', reason: '', approvedBy: '', notes: '', status: 'pending' })
    }
  }

  async function fetchRecords() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeType })
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/whs?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setRecords(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [activeType, filterStatus])

  useEffect(() => {
    resetForm()
    setShowForm(false)
  }, [activeType, session])

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/whs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, ...form }),
      })
      if (!res.ok) throw new Error('Failed')
      setMessage('Saved')
      setShowForm(false)
      fetchRecords()
    } catch {
      setMessage('Save failed')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await fetch(`/api/whs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, status: newStatus }),
      })
      fetchRecords()
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return
    try {
      await fetch(`/api/whs/${id}?type=${activeType}`, { method: 'DELETE' })
      fetchRecords()
    } catch {}
  }

  function renderForm() {
    if (activeType === 'injury') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input style={inputStyle} value={form.date || ''} onChange={(e) => setField('date', e.target.value)} placeholder="dd/mm/yy" />
            </div>
            <div>
              <label style={labelStyle}>Worker Involved *</label>
              <select style={inputStyle} value={form.workerName || ''} onChange={(e) => setField('workerName', e.target.value)}>
                <option value="">Select worker...</option>
                {(workers || []).map((w: any) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description of Incident *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="What happened?" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Body Part Affected</label>
              <input style={inputStyle} value={form.bodyPart || ''} onChange={(e) => setField('bodyPart', e.target.value)} placeholder="e.g. Left hand, lower back" />
            </div>
            <div>
              <label style={labelStyle}>Reported By</label>
              <input style={inputStyle} value={form.reportedBy || ''} onChange={(e) => setField('reportedBy', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { key: 'treatmentRequired', label: 'Treatment Required' },
              { key: 'medicalAttention', label: 'Medical Attention' },
              { key: 'lostTime', label: 'Lost Time Injury' },
            ].map((c) => (
              <label key={c.key} style={checkStyle} onClick={() => setField(c.key, !form[c.key])}>
                <div style={{
                  width: 18, height: 18, borderRadius: 3, border: '1.5px solid var(--border2)',
                  background: form[c.key] ? '#E8681A' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {form[c.key] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
              </label>
            ))}
          </div>
          <div>
            <label style={labelStyle}>Action Taken</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.actionTaken || ''} onChange={(e) => setField('actionTaken', e.target.value)} placeholder="Immediate actions taken..." />
          </div>
        </div>
      )
    }

    if (activeType === 'audit') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input style={inputStyle} value={form.date || ''} onChange={(e) => setField('date', e.target.value)} placeholder="dd/mm/yy" />
            </div>
            <div>
              <label style={labelStyle}>Conducted By *</label>
              <input style={inputStyle} value={form.conductedBy || ''} onChange={(e) => setField('conductedBy', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Area / Location *</label>
              <input style={inputStyle} value={form.area || ''} onChange={(e) => setField('area', e.target.value)} placeholder="e.g. Fab Bay, Paint Shop" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Findings</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.findings || ''} onChange={(e) => setField('findings', e.target.value)} placeholder="Issues observed..." />
          </div>
          <div>
            <label style={labelStyle}>Actions Required</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.actionsRequired || ''} onChange={(e) => setField('actionsRequired', e.target.value)} placeholder="Follow-up actions..." />
          </div>
          <div style={{ maxWidth: 200 }}>
            <label style={labelStyle}>Compliance Score (0–100)</label>
            <input style={inputStyle} type="number" min={0} max={100} value={form.score ?? 0} onChange={(e) => setField('score', parseInt(e.target.value) || 0)} />
          </div>
        </div>
      )
    }

    if (activeType === 'nearmiss') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input style={inputStyle} value={form.date || ''} onChange={(e) => setField('date', e.target.value)} placeholder="dd/mm/yy" />
            </div>
            <div>
              <label style={labelStyle}>Reported By *</label>
              <input style={inputStyle} value={form.reportedBy || ''} onChange={(e) => setField('reportedBy', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Location *</label>
              <input style={inputStyle} value={form.location || ''} onChange={(e) => setField('location', e.target.value)} placeholder="e.g. Fab Bay, Yard" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="What nearly happened?" />
          </div>
          <div>
            <label style={labelStyle}>Potential Injury / Consequence</label>
            <input style={inputStyle} value={form.potentialInjury || ''} onChange={(e) => setField('potentialInjury', e.target.value)} placeholder="e.g. Crush injury, fall" />
          </div>
          <div>
            <label style={labelStyle}>Action Taken</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.actionTaken || ''} onChange={(e) => setField('actionTaken', e.target.value)} placeholder="What was done to prevent recurrence?" />
          </div>
        </div>
      )
    }

    if (activeType === 'timeoff') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Worker *</label>
              <select style={inputStyle} value={form.workerName || ''} onChange={(e) => setField('workerName', e.target.value)}>
                <option value="">Select worker...</option>
                {(workers || []).map((w: any) => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Reason *</label>
              <select style={inputStyle} value={form.reason || ''} onChange={(e) => setField('reason', e.target.value)}>
                <option value="">Select reason...</option>
                <option>Annual Leave</option>
                <option>Sick Leave</option>
                <option>Carers Leave</option>
                <option>Compassionate Leave</option>
                <option>Workers Compensation</option>
                <option>Unpaid Leave</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input style={inputStyle} value={form.startDate || ''} onChange={(e) => setField('startDate', e.target.value)} placeholder="dd/mm/yy" />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} value={form.endDate || ''} onChange={(e) => setField('endDate', e.target.value)} placeholder="dd/mm/yy" />
            </div>
            <div>
              <label style={labelStyle}>Approved By</label>
              <input style={inputStyle} value={form.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} />
          </div>
        </div>
      )
    }

    return null
  }

  function renderRecord(r: any) {
    const expanded = expandedId === r.id
    const sc = STATUS_COLORS[r.status] || STATUS_COLORS.open

    const statusOptions = activeType === 'timeoff'
      ? ['pending', 'approved', 'declined']
      : ['open', 'closed']

    return (
      <div key={r.id} style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div
          onClick={() => setExpandedId(expanded ? null : r.id)}
          style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: 18 }}>{FORM_ICONS[activeType]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {activeType === 'injury' && `${r.workerName} — ${r.date}`}
              {activeType === 'audit' && `${r.area} — ${r.date}`}
              {activeType === 'nearmiss' && `${r.location} — ${r.date}`}
              {activeType === 'timeoff' && `${r.workerName} — ${r.startDate}${r.endDate ? ' → ' + r.endDate : ''}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeType === 'injury' && r.description}
              {activeType === 'audit' && `Conducted by ${r.conductedBy}${r.score > 0 ? ` · Score: ${r.score}/100` : ''}`}
              {activeType === 'nearmiss' && r.description}
              {activeType === 'timeoff' && r.reason}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 3,
            background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
            flexShrink: 0,
          }}>
            {r.status}
          </span>
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {expanded && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 14, marginBottom: 14 }}>
              {Object.entries(r)
                .filter(([k]) => !['id', 'createdAt', 'status'].includes(k))
                .map(([k, v]) => {
                  const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
                  const val = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v || '—')
                  return (
                    <div key={k}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, color: '#fff' }}>{val}</div>
                    </div>
                  )
                })}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Change status:</span>
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(r.id, s)}
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    padding: '4px 10px', borderRadius: 3, cursor: r.status === s ? 'default' : 'pointer',
                    border: `1px solid ${(STATUS_COLORS[s] || STATUS_COLORS.open).border}`,
                    background: r.status === s ? (STATUS_COLORS[s] || STATUS_COLORS.open).bg : 'transparent',
                    color: (STATUS_COLORS[s] || STATUS_COLORS.open).text,
                    opacity: r.status === s ? 1 : 0.6,
                  }}
                >
                  {s}{r.status === s && ' ✓'}
                </button>
              ))}
              <button
                onClick={() => handleDelete(r.id)}
                style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.8)' }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            WHS Forms
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Workplace Health &amp; Safety — Injuries, Audits, Near Misses &amp; Leave
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          style={{
            fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', padding: '12px 24px', borderRadius: 8, cursor: 'pointer',
            border: 'none', background: '#E8681A', color: '#fff',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ff7a2e' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#E8681A' }}
        >
          + New {FORM_LABELS[activeType].split(' ')[0]}
        </button>
      </div>

      {/* Form type tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }}>
        {(Object.keys(FORM_LABELS) as FormType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            style={{
              flex: 1, fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase', padding: '10px 16px', borderRadius: 5,
              cursor: 'pointer', border: 'none',
              background: activeType === t ? '#E8681A' : 'transparent',
              color: activeType === t ? '#fff' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >
            {FORM_ICONS[t]} {FORM_LABELS[t].split('/')[0].trim()}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(activeType === 'timeoff' ? ['', 'pending', 'approved', 'declined'] : ['', 'open', 'closed']).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase', padding: '5px 12px', borderRadius: 3, cursor: 'pointer',
              border: `1px solid ${filterStatus === s ? '#E8681A' : 'var(--border)'}`,
              background: filterStatus === s ? 'rgba(232,104,26,0.15)' : 'transparent',
              color: filterStatus === s ? '#E8681A' : 'var(--text3)',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* New form modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
            padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: 1.5 }}>
                {FORM_ICONS[activeType]} {FORM_LABELS[activeType].toUpperCase()}
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            {renderForm()}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '10px 20px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ padding: '10px 24px', borderRadius: 4, cursor: 'pointer', border: 'none', background: '#E8681A', color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Submit Form'}
              </button>
            </div>
            {message && <div style={{ marginTop: 10, fontSize: 12, color: message.includes('fail') ? 'var(--red)' : 'var(--green)', textAlign: 'right' }}>{message}</div>}
          </div>
        </div>
      )}

      {/* Records list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{FORM_ICONS[activeType]}</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No records yet</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Submit a form to get started</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((r) => renderRecord(r))}
        </div>
      )}
    </div>
  )
}
