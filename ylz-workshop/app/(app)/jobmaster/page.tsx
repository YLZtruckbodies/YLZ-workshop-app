'use client'

import { useEffect, useState, useCallback } from 'react'

interface JobMasterRow {
  id: string
  jobNumber: string
  jobType: string
  customer: string
  completed: boolean
  invoiced: string
  dimensions: string
  notes: string
}

const JOB_TYPES = ['TRUCK', 'TRAILER', 'SEMI TRAILER', 'PIG TRAILER', 'CRANE TRAY', 'CONVERTER DOLLY', 'WHEELBASE', 'SPARE', 'OTHER']

const colStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontSize: 13,
  color: '#fff',
  verticalAlign: 'middle',
}

export default function JobMasterPage() {
  const [jobs, setJobs] = useState<JobMasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newRow, setNewRow] = useState({ jobNumber: '', jobType: 'TRUCK', customer: '', completed: false, invoiced: '', dimensions: '', notes: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/job-master')
    const data = await res.json()
    setJobs(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(id: string, field: string, value: any) {
    setSaving(id)
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, [field]: value } : j))
    await fetch(`/api/job-master/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    setSaving(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this job?')) return
    setJobs((prev) => prev.filter((j) => j.id !== id))
    await fetch(`/api/job-master/${id}`, { method: 'DELETE' })
  }

  async function handleAddNew() {
    if (!newRow.jobNumber.trim()) return
    setSaving('new')
    const res = await fetch('/api/job-master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRow),
    })
    const created = await res.json()
    setJobs((prev) => [...prev, created])
    setNewRow({ jobNumber: '', jobType: 'TRUCK', customer: '', completed: false, invoiced: '', dimensions: '', notes: '' })
    setAdding(false)
    setSaving(null)
  }

  async function handleNextNumber() {
    const res = await fetch('/api/job-master/next-number')
    const { jobNumber } = await res.json()
    setNewRow((prev) => ({ ...prev, jobNumber }))
  }

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase()
    const matchSearch = !q || j.jobNumber.toLowerCase().includes(q) || j.customer.toLowerCase().includes(q)
    const matchType = !filterType || j.jobType === filterType
    const matchStatus =
      !filterStatus ||
      (filterStatus === 'active' && !j.completed) ||
      (filterStatus === 'completed' && j.completed && !j.invoiced) ||
      (filterStatus === 'invoiced' && !!j.invoiced && j.invoiced.toLowerCase() !== 'no' && j.invoiced.toLowerCase() !== 'pending')
    return matchSearch && matchType && matchStatus
  })

  const completedCount = jobs.filter((j) => j.completed).length
  const invoicedCount = jobs.filter((j) => j.invoiced && j.invoiced.toLowerCase() !== '' && j.invoiced.toLowerCase() !== 'no').length
  const activeCount = jobs.filter((j) => !j.completed).length

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
            Job Sheet Master
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {jobs.length} total &nbsp;·&nbsp; {activeCount} active &nbsp;·&nbsp; {completedCount} completed &nbsp;·&nbsp; {invoicedCount} invoiced
          </div>
        </div>
        <button
          onClick={() => { setAdding(true); handleNextNumber() }}
          style={{ background: '#E8681A', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.5 }}
        >
          + New Job
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search job number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13, width: 260 }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13 }}
        >
          <option value="">All Types</option>
          {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 13 }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="invoiced">Invoiced</option>
        </select>
        {(search || filterType || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus('') }}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--dark2)' }}>
              {['Job Number', 'Type', 'Customer', 'Completed', 'Invoiced', 'Dimensions', 'Notes', ''].map((h) => (
                <th key={h} style={{ ...colStyle, fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* New row */}
            {adding && (
              <tr style={{ background: 'rgba(232,104,26,0.07)' }}>
                <td style={colStyle}>
                  <input
                    value={newRow.jobNumber}
                    onChange={(e) => setNewRow((p) => ({ ...p, jobNumber: e.target.value }))}
                    placeholder="YLZ 1094"
                    style={inputStyle}
                    autoFocus
                  />
                </td>
                <td style={colStyle}>
                  <select value={newRow.jobType} onChange={(e) => setNewRow((p) => ({ ...p, jobType: e.target.value }))} style={inputStyle}>
                    {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td style={colStyle}>
                  <input value={newRow.customer} onChange={(e) => setNewRow((p) => ({ ...p, customer: e.target.value }))} placeholder="Customer" style={inputStyle} />
                </td>
                <td style={{ ...colStyle, textAlign: 'center' }}>
                  <input type="checkbox" checked={newRow.completed} onChange={(e) => setNewRow((p) => ({ ...p, completed: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </td>
                <td style={colStyle}>
                  <input value={newRow.invoiced} onChange={(e) => setNewRow((p) => ({ ...p, invoiced: e.target.value }))} placeholder="Invoice # or status" style={inputStyle} />
                </td>
                <td style={colStyle}>
                  <input value={newRow.dimensions} onChange={(e) => setNewRow((p) => ({ ...p, dimensions: e.target.value }))} placeholder="e.g. 4660 x 1000" style={inputStyle} />
                </td>
                <td style={colStyle}>
                  <input value={newRow.notes} onChange={(e) => setNewRow((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" style={inputStyle} />
                </td>
                <td style={colStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleAddNew} disabled={saving === 'new'} style={{ ...btnStyle, background: '#E8681A' }}>Save</button>
                    <button onClick={() => setAdding(false)} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)' }}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}

            {loading ? (
              <tr><td colSpan={8} style={{ ...colStyle, textAlign: 'center', color: 'var(--text3)', padding: 40 }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ ...colStyle, textAlign: 'center', color: 'var(--text3)', padding: 40 }}>No jobs found</td></tr>
            ) : filtered.map((job) => (
              <tr
                key={job.id}
                style={{
                  background: job.completed && job.invoiced
                    ? 'rgba(34,197,94,0.04)'
                    : job.completed
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                  opacity: saving === job.id ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* Job Number */}
                <td style={{ ...colStyle, fontWeight: 700, fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                  <EditableCell value={job.jobNumber} onSave={(v) => patch(job.id, 'jobNumber', v)} />
                </td>

                {/* Type */}
                <td style={colStyle}>
                  <select
                    value={job.jobType}
                    onChange={(e) => patch(job.id, 'jobType', e.target.value)}
                    style={{ ...inputStyle, fontSize: 12 }}
                  >
                    {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>

                {/* Customer */}
                <td style={{ ...colStyle, minWidth: 220 }}>
                  <EditableCell value={job.customer} onSave={(v) => patch(job.id, 'customer', v)} />
                </td>

                {/* Completed */}
                <td style={{ ...colStyle, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={job.completed}
                    onChange={(e) => patch(job.id, 'completed', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                </td>

                {/* Invoiced */}
                <td style={{ ...colStyle, minWidth: 160 }}>
                  <EditableCell value={job.invoiced} placeholder="Invoice # or status" onSave={(v) => patch(job.id, 'invoiced', v)} />
                </td>

                {/* Dimensions */}
                <td style={colStyle}>
                  <EditableCell value={job.dimensions} placeholder="e.g. 4660 x 1000" onSave={(v) => patch(job.id, 'dimensions', v)} />
                </td>

                {/* Notes */}
                <td style={{ ...colStyle, minWidth: 160 }}>
                  <EditableCell value={job.notes} placeholder="Notes" onSave={(v) => patch(job.id, 'notes', v)} />
                </td>

                {/* Delete */}
                <td style={{ ...colStyle, textAlign: 'center' }}>
                  <button onClick={() => handleDelete(job.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '5px 8px',
  color: '#fff',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 4,
  padding: '5px 12px',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

function EditableCell({ value, placeholder, onSave }: { value: string; placeholder?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ cursor: 'text', minHeight: 22, padding: '1px 4px', borderRadius: 3, color: value ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 13 }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        {value || placeholder || '—'}
      </div>
    )
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(draft); setEditing(false) }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      style={{ ...inputStyle, padding: '3px 6px' }}
    />
  )
}
