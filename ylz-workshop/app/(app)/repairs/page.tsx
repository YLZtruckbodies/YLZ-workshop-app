'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRepairJobs, createRepairJob, updateRepairJob, deleteRepairJob } from '@/lib/hooks'

type RepairType = 'Repair' | 'Warranty'
type RepairStatus = 'Open' | 'In Progress' | 'Complete'

interface RepairForm {
  type: RepairType
  description: string
  status: RepairStatus
  dateReported: string
  dateCompleted: string
  customerName: string
  repairCost: number
  partsRequired: string
  bookingDate: string
  assignedTo: string
}

const emptyForm = (): RepairForm => ({
  type: 'Repair',
  description: '',
  status: 'Open',
  dateReported: '',
  dateCompleted: '',
  customerName: '',
  repairCost: 0,
  partsRequired: '',
  bookingDate: '',
  assignedTo: '',
})

const TYPE_COLORS: Record<string, string> = {
  Repair: '#f5a623',
  Warranty: '#3b9de8',
}

const STATUS_COLORS: Record<string, string> = {
  Open: '#e84560',
  'In Progress': '#f5a623',
  Complete: '#22d07a',
}

export default function RepairsPage() {
  const { data: session } = useSession()
  const { data: repairs, mutate } = useRepairJobs()

  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RepairForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`

  const filtered = useMemo(() => {
    if (!repairs) return []
    return (repairs as any[]).filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false
      if (filterType && r.type !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.num.toLowerCase().includes(q) &&
          !r.description.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [repairs, filterStatus, filterType, search])

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm(), dateReported: todayStr })
    setModalOpen(true)
  }

  function openEdit(r: any) {
    setEditingId(r.id)
    setForm({
      type: r.type,
      description: r.description,
      status: r.status,
      dateReported: r.dateReported,
      dateCompleted: r.dateCompleted,
      customerName: r.customerName || '',
      repairCost: r.repairCost || 0,
      partsRequired: r.partsRequired || '',
      bookingDate: r.bookingDate || '',
      assignedTo: r.assignedTo || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.description.trim()) {
      setMessage('Description is required')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateRepairJob(editingId, form)
      } else {
        await createRepairJob({
          ...form,
          createdBy: (session?.user as any)?.id || '',
        })
      }
      mutate()
      setModalOpen(false)
      setMessage(editingId ? 'Updated' : 'Created')
    } catch {
      setMessage('Failed to save')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this repair/warranty entry?')) return
    try {
      await deleteRepairJob(id)
      mutate()
      setMessage('Deleted')
    } catch {
      setMessage('Failed to delete')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            REPAIRS / WARRANTY
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Track repair and warranty jobs
          </div>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          + New
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}>
              <option value="">All</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Complete">Complete</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, width: 160 }}>
              <option value="">All</option>
              <option value="Repair">Repair</option>
              <option value="Warranty">Warranty</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>Search</label>
            <input
              type="text"
              placeholder="Search by number or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </div>
          {message && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: message.includes('Failed') ? 'var(--red)' : 'var(--green)',
                alignSelf: 'center',
              }}
            >
              {message}
            </span>
          )}
        </div>

        {/* Table */}
        <div
          style={{
            background: 'var(--dark2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Number</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Booking</th>
                <th style={thStyle}>Reported</th>
                <th style={{ ...thStyle, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                    {repairs ? 'No entries found' : 'Loading...'}
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: '0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "'League Spartan', sans-serif", fontWeight: 700, letterSpacing: 1, fontSize: 14 }}>
                        {r.num}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(TYPE_COLORS[r.type] || '#888')}>{r.type}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 160 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.customerName || '—'}</span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                        {r.description || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.assignedTo || '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(STATUS_COLORS[r.status] || '#888')}>{r.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.bookingDate || '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.dateReported || '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(r.id)
                        }}
                        style={deleteBtnStyle}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 28,
              width: 440,
              maxWidth: '90vw',
            }}
          >
            <div
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 1.5,
                marginBottom: 20,
              }}
            >
              {editingId ? 'EDIT ENTRY' : 'NEW ENTRY'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!editingId && (
                <div>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as RepairType })}
                    style={inputStyle}
                  >
                    <option value="Repair">Repair</option>
                    <option value="Warranty">Warranty</option>
                  </select>
                </div>
              )}

              {editingId && (
                <div>
                  <label style={labelStyle}>Type</label>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TYPE_COLORS[form.type], padding: '10px 0' }}>
                    {form.type}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Door latch replacement"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as RepairStatus })}
                  style={inputStyle}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Customer / Company</label>
                <input
                  type="text"
                  placeholder="e.g. CMV Dandenong"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Booking Date</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yy"
                    value={form.bookingDate}
                    onChange={(e) => setForm({ ...form, bookingDate: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Assigned To</label>
                  <input
                    type="text"
                    placeholder="e.g. Ben"
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Parts Required</label>
                <input
                  type="text"
                  placeholder="e.g. Hinge x2, latch x1"
                  value={form.partsRequired}
                  onChange={(e) => setForm({ ...form, partsRequired: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Repair Cost (ex GST)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.repairCost || ''}
                    onChange={(e) => setForm({ ...form, repairCost: parseFloat(e.target.value) || 0 })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date Reported</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yy"
                    value={form.dateReported}
                    onChange={(e) => setForm({ ...form, dateReported: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {form.status === 'Complete' && (
                <div>
                  <label style={labelStyle}>Date Completed</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yy"
                    value={form.dateCompleted}
                    onChange={(e) => setForm({ ...form, dateCompleted: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalOpen(false)} style={cancelBtnStyle}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 6,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--dark3)',
  border: '1px solid var(--border2)',
  borderRadius: 4,
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  minHeight: 44,
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: 'var(--text3)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border2)',
  background: 'var(--dark3)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 3,
    color,
    background: `${color}15`,
    border: `1px solid ${color}30`,
  }
}

const primaryBtnStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '10px 22px',
  borderRadius: 3,
  cursor: 'pointer',
  border: '1.5px solid rgba(255,255,255,0.12)',
  background: 'var(--btn-primary)',
  color: '#f7f7f7',
  minHeight: 40,
}

const cancelBtnStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  padding: '10px 22px',
  borderRadius: 3,
  cursor: 'pointer',
  border: '1.5px solid var(--border2)',
  background: 'transparent',
  color: 'var(--text2)',
  minHeight: 40,
}

const deleteBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 3,
  border: '1px solid var(--border2)',
  background: 'transparent',
  color: 'var(--text3)',
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
