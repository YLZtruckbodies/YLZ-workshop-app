'use client'

import { useState } from 'react'

interface SalesEntry {
  id: string
  customer: string
  contactName: string
  contactPhone: string
  contactEmail: string
  quoteNumber: string
  jobType: string
  description: string
  quoteValue: string
  status: string
  followUpDate: string
  notes: string
}

const EMPTY_ENTRY: Omit<SalesEntry, 'id'> = {
  customer: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  quoteNumber: '',
  jobType: '',
  description: '',
  quoteValue: '',
  status: 'enquiry',
  followUpDate: '',
  notes: '',
}

const STATUS_OPTIONS = [
  { value: 'enquiry', label: 'Enquiry', color: '#3b9de8' },
  { value: 'quoted', label: 'Quoted', color: '#f5a623' },
  { value: 'negotiating', label: 'Negotiating', color: '#a78bfa' },
  { value: 'won', label: 'Won', color: '#22d07a' },
  { value: 'lost', label: 'Lost', color: '#e84560' },
]

export default function SalesPage() {
  const [entries, setEntries] = useState<SalesEntry[]>([])
  const [form, setForm] = useState(EMPTY_ENTRY)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!form.customer.trim()) return
    if (editingId) {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? { ...form, id: editingId } : e)))
      setEditingId(null)
    } else {
      setEntries((prev) => [...prev, { ...form, id: Date.now().toString() }])
    }
    setForm(EMPTY_ENTRY)
  }

  const startEdit = (entry: SalesEntry) => {
    setEditingId(entry.id)
    const { id, ...rest } = entry
    setForm(rest)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_ENTRY)
  }

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this entry?')) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (editingId === id) cancelEdit()
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          Sales
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Track customer enquiries, quotes, and sales pipeline.
        </div>
      </div>

      {/* Input Form */}
      <div style={{
        background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6,
        padding: 20, marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
          color: editingId ? '#f5a623' : 'var(--text3)', marginBottom: 16,
        }}>
          {editingId ? 'Edit Entry' : 'New Sales Entry'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Field label="Customer / Company" value={form.customer} onChange={(v) => setForm({ ...form, customer: v })} placeholder="e.g. ABC Transport" />
          <Field label="Contact Name" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} placeholder="e.g. John Smith" />
          <Field label="Contact Phone" value={form.contactPhone} onChange={(v) => setForm({ ...form, contactPhone: v })} placeholder="e.g. 0412 345 678" />
          <Field label="Contact Email" value={form.contactEmail} onChange={(v) => setForm({ ...form, contactEmail: v })} placeholder="e.g. john@abc.com.au" />
          <Field label="Quote Number" value={form.quoteNumber} onChange={(v) => setForm({ ...form, quoteNumber: v })} placeholder="e.g. Q-2026-001" />
          <Field label="Job Type" value={form.jobType} onChange={(v) => setForm({ ...form, jobType: v })} placeholder="e.g. Tipper, Tray, Service Body" />
          <Field label="Quote Value ($)" value={form.quoteValue} onChange={(v) => setForm({ ...form, quoteValue: v })} placeholder="e.g. 85000" type="number" />
          <div>
            <div style={labelStyle}>Status</div>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <Field label="Follow-up Date" value={form.followUpDate} onChange={(v) => setForm({ ...form, followUpDate: v })} placeholder="dd/mm/yyyy" />
          <div style={{ gridColumn: 'span 3' }}>
            <div style={labelStyle}>Description / Notes</div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={inputStyle}
              placeholder="Build details, special requirements, etc."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleSubmit} style={btnPrimary}>
            {editingId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} style={btnSecondary}>Cancel</button>
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div style={{
        background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
      }}>
        {entries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No sales entries yet. Use the form above to add your first entry.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Customer', 'Contact', 'Quote #', 'Job Type', 'Value', 'Status', 'Follow-up', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 700, color: '#fff' }}>{entry.customer}</div>
                      {entry.description && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.description}
                        </div>
                      )}
                    </td>
                    <td style={cellStyle}>
                      <div>{entry.contactName || '\u2014'}</div>
                      {entry.contactPhone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{entry.contactPhone}</div>}
                    </td>
                    <td style={cellStyle}>{entry.quoteNumber || '\u2014'}</td>
                    <td style={cellStyle}>{entry.jobType || '\u2014'}</td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>
                      {entry.quoteValue ? `$${Number(entry.quoteValue).toLocaleString()}` : '\u2014'}
                    </td>
                    <td style={cellStyle}>
                      <StatusPill status={entry.status} />
                    </td>
                    <td style={cellStyle}>{entry.followUpDate || '\u2014'}</td>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(entry)} style={btnSmall('#3b9de8')}>Edit</button>
                        <button onClick={() => deleteEntry(entry.id)} style={btnSmall('#e84560')}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} placeholder={placeholder} />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status)
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
      background: `${opt?.color || '#666'}22`, color: opt?.color || '#666',
    }}>
      {opt?.label || status}
    </span>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  color: 'var(--text3)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--dark3)', border: '1px solid var(--border)',
  borderRadius: 4, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
  fontFamily: "'League Spartan', sans-serif",
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', whiteSpace: 'nowrap',
}

const cellStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: '#fff', whiteSpace: 'nowrap',
}

const btnPrimary: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  padding: '10px 24px', borderRadius: 4, cursor: 'pointer', border: 'none',
  background: '#E8681A', color: '#fff', minHeight: 40,
}

const btnSecondary: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  padding: '10px 24px', borderRadius: 4, cursor: 'pointer',
  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', minHeight: 40,
}

function btnSmall(color: string): React.CSSProperties {
  return {
    fontFamily: "'League Spartan', sans-serif",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    padding: '5px 12px', borderRadius: 3, cursor: 'pointer',
    border: `1px solid ${color}`, background: 'transparent', color, minHeight: 28, whiteSpace: 'nowrap',
  }
}
