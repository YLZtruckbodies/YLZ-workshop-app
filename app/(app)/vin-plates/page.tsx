'use client'

import { useState, useEffect, useCallback } from 'react'

type VinRecord = {
  id: string
  vin: string
  axleType: string
  hubConfiguration: string
  type: string
  jobNumber: string
  customer: string
  notes: string
  vinPlateOrdered: boolean
  vinPlateReceived: boolean
  roverInput: boolean
  createdAt: string
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid #333', borderRadius: 6,
  padding: '8px 10px', color: '#fff', fontSize: 13, width: '100%', outline: 'none',
}

const thStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', color: '#888',
  padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #333',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: '#fff', borderBottom: '1px solid #222',
}

const btnStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px',
  borderRadius: 6, cursor: 'pointer', border: 'none',
}

const emptyForm = {
  vin: '', axleType: '', hubConfiguration: '', type: '', jobNumber: '', customer: '', notes: '',
  vinPlateOrdered: false, vinPlateReceived: false, roverInput: false,
}

function BoolSelect({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <select
      value={value ? 'yes' : 'no'}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value === 'yes')}
      style={{
        background: value ? '#1a3a1a' : '#2a1a1a',
        border: `1px solid ${value ? '#2d6a2d' : '#4a2020'}`,
        borderRadius: 5, padding: '4px 8px',
        color: value ? '#4ade80' : '#f87171',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none',
        fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.5,
        minWidth: 64,
      }}
    >
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  )
}

export default function VinPlatesPage() {
  const [records, setRecords] = useState<VinRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    try {
      const q = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/vin-plates${q}`)
      if (res.ok) {
        const data: VinRecord[] = await res.json()
        data.sort((a, b) => parseInt(b.jobNumber) - parseInt(a.jobNumber))
        setRecords(data)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [search])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.vin && !form.jobNumber) return
    setSaving(true)
    try {
      if (editId) {
        await fetch(`/api/vin-plates/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/vin-plates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setForm(emptyForm)
      setEditId(null)
      setShowForm(false)
      await fetchRecords()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const handleEdit = (r: VinRecord) => {
    setForm({
      vin: r.vin, axleType: r.axleType, hubConfiguration: r.hubConfiguration,
      type: r.type, jobNumber: r.jobNumber, customer: r.customer, notes: r.notes,
      vinPlateOrdered: r.vinPlateOrdered, vinPlateReceived: r.vinPlateReceived, roverInput: r.roverInput,
    })
    setEditId(r.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this VIN plate record?')) return
    setDeleting(id)
    try {
      await fetch(`/api/vin-plates/${id}`, { method: 'DELETE' })
      await fetchRecords()
    } catch { /* ignore */ }
    setDeleting(null)
  }

  const cancelEdit = () => {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
  }

  // Inline toggle for the 3 boolean fields
  const handleToggle = async (id: string, field: 'vinPlateOrdered' | 'vinPlateReceived' | 'roverInput', current: boolean) => {
    setTogglingId(id + field)
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: !current } : r))
    try {
      await fetch(`/api/vin-plates/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !current }),
      })
    } catch {
      // revert on error
      setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: current } : r))
    }
    setTogglingId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 800,
              letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0,
            }}>
              VIN Plate Records
            </h1>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {records.length} record{records.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              placeholder="Search VIN, job, customer..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 220 }}
            />
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
              style={{ ...btnStyle, background: '#E8681A', color: '#fff' }}
            >
              + Add Record
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ padding: '0 24px 16px', flexShrink: 0 }}>
          <div style={{
            background: '#141425', border: '1px solid #333', borderRadius: 10, padding: 20,
          }}>
            <div style={{
              fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase', color: '#E8681A', marginBottom: 16,
            }}>
              {editId ? 'Edit Record' : 'New VIN Plate Record'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Job Number</label>
                <input value={form.jobNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('jobNumber', e.target.value)} style={inputStyle} placeholder="e.g. YLZ1103" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>VIN</label>
                <input value={form.vin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('vin', e.target.value)} style={inputStyle} placeholder="Vehicle Identification Number" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Type</label>
                <input value={form.type} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('type', e.target.value)} style={inputStyle} placeholder="e.g. ALLY, HARDOX" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Customer</label>
                <input value={form.customer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('customer', e.target.value)} style={inputStyle} placeholder="Customer name" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Axle Type</label>
                <input value={form.axleType} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('axleType', e.target.value)} style={inputStyle} placeholder="e.g. 4 AXLE" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Hub Configuration</label>
                <input value={form.hubConfiguration} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('hubConfiguration', e.target.value)} style={inputStyle} placeholder="e.g. SAF DISC 335" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Notes</label>
              <input value={form.notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('notes', e.target.value)} style={inputStyle} placeholder="Optional notes" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, maxWidth: 480 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Plate Ordered</label>
                <select value={form.vinPlateOrdered ? 'yes' : 'no'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('vinPlateOrdered', e.target.value === 'yes')} style={{ ...inputStyle, width: 'auto' }}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Plate Received</label>
                <select value={form.vinPlateReceived ? 'yes' : 'no'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('vinPlateReceived', e.target.value === 'yes')} style={{ ...inputStyle, width: 'auto' }}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>Rover Input</label>
                <select value={form.roverInput ? 'yes' : 'no'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('roverInput', e.target.value === 'yes')} style={{ ...inputStyle, width: 'auto' }}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: '#E8681A', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
              </button>
              <button onClick={cancelEdit} style={{ ...btnStyle, background: 'transparent', color: '#888', border: '1px solid #333' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        {loading ? (
          <div style={{ color: '#888', padding: 40, textAlign: 'center' }}>Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ color: '#888', padding: 40, textAlign: 'center' }}>
            {search ? 'No records match your search.' : 'No VIN plate records yet. Click "+ Add Record" to get started.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Job Number</th>
                <th style={thStyle}>VIN</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Axle Type</th>
                <th style={thStyle}>Hub Config</th>
                <th style={thStyle}>Plate Ordered</th>
                <th style={thStyle}>Plate Received</th>
                <th style={thStyle}>Rover Input</th>
                <th style={thStyle}>Date Added</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: VinRecord) => (
                <tr key={r.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={(e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = '#1a1a2e' }}
                  onMouseLeave={(e: React.MouseEvent<HTMLTableRowElement>) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#E8681A' }}>{r.jobNumber || '-'}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', letterSpacing: 1 }}>{r.vin || '-'}</td>
                  <td style={tdStyle}>{r.type || '-'}</td>
                  <td style={tdStyle}>{r.customer || '-'}</td>
                  <td style={tdStyle}>{r.axleType || '-'}</td>
                  <td style={tdStyle}>{r.hubConfiguration || '-'}</td>
                  <td style={tdStyle}>
                    <BoolSelect
                      value={r.vinPlateOrdered}
                      onChange={(v) => { if (togglingId !== r.id + 'vinPlateOrdered') handleToggle(r.id, 'vinPlateOrdered', r.vinPlateOrdered) }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <BoolSelect
                      value={r.vinPlateReceived}
                      onChange={(v) => { if (togglingId !== r.id + 'vinPlateReceived') handleToggle(r.id, 'vinPlateReceived', r.vinPlateReceived) }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <BoolSelect
                      value={r.roverInput}
                      onChange={(v) => { if (togglingId !== r.id + 'roverInput') handleToggle(r.id, 'roverInput', r.roverInput) }}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleEdit(r)}
                      style={{ ...btnStyle, background: 'transparent', color: '#E8681A', padding: '4px 10px', fontSize: 10 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      style={{ ...btnStyle, background: 'transparent', color: '#666', padding: '4px 10px', fontSize: 10, marginLeft: 4 }}
                    >
                      {deleting === r.id ? '...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
