'use client'

import { useSession } from 'next-auth/react'
import { useState, useMemo, useCallback } from 'react'
import {
  useJobs,
  useColdformKits,
  useColdformChassis,
  useColdformDeliveries,
  createColdformKit,
  updateColdformKit,
  deleteColdformKit,
  createColdformChassis,
  updateColdformChassis,
  deleteColdformChassis,
  createColdformDelivery,
  updateColdformDelivery,
  deleteColdformDelivery,
} from '@/lib/hooks'

const TABS = ['Hardox Kits', 'Trailer Chassis', 'Delivery Schedule'] as const
type Tab = (typeof TABS)[number]

const KIT_PARTS = [
  { key: 'walls', label: 'Walls' },
  { key: 'tunnel', label: 'Tunnel' },
  { key: 'floor', label: 'Floor' },
  { key: 'headBoard', label: 'Head Board' },
  { key: 'tailGate', label: 'Tail Gate' },
  { key: 'splashGuards', label: 'Splash Guards' },
  { key: 'lightStrips', label: 'Light Strips' },
] as const

function statusColor(val: string): string {
  const v = val.toLowerCase().trim()
  if (v === 'y' || v === 'yes') return '#22d07a'
  if (v === 'n' || v === 'no') return '#e84560'
  if (v === 'o/s' || v === 'ordered') return '#f5a623'
  return 'rgba(255,255,255,0.15)'
}

function statusLabel(val: string): string {
  const v = val.toLowerCase().trim()
  if (v === 'y' || v === 'yes') return 'Y'
  if (v === 'n' || v === 'no') return 'N'
  if (v === 'o/s' || v === 'ordered') return 'O/S'
  return val || '\u2014'
}

function nextStatus(val: string): string {
  const v = val.toLowerCase().trim()
  if (v === 'n' || v === 'no' || v === '') return 'Y'
  if (v === 'y' || v === 'yes') return 'O/S'
  if (v === 'o/s' || v === 'ordered') return 'N'
  return 'Y'
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
        padding: '14px 20px',
        minWidth: 140,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// Shared job select dropdown
function JobSelect({
  value,
  onChange,
  jobs,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  jobs: any[]
  placeholder?: string
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
      <option value="">{placeholder || '\u2014 Select Job \u2014'}</option>
      {jobs.map((j: any) => (
        <option key={j.id} value={j.num}>
          {j.num} \u2014 {j.type}
        </option>
      ))}
    </select>
  )
}

// Display a job number with its type from the jobs list
function JobBadge({ num, jobs }: { num: string; jobs: any[] }) {
  const job = jobs.find((j: any) => j.num === num)
  if (!num) return <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>
  return (
    <span>
      <span style={{ fontWeight: 600, color: '#3b9de8' }}>{num}</span>
      {job && <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 6 }}>{job.type}</span>}
      {!job && num && <span style={{ color: '#f5a623', fontSize: 10, marginLeft: 6 }}>(not in jobs)</span>}
    </span>
  )
}

// ============== HARDOX KITS TAB ==============
function HardoxKitsTab({ jobs }: { jobs: any[] }) {
  const { data: kits, mutate } = useColdformKits()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [adding, setAdding] = useState(false)
  const [newKit, setNewKit] = useState({ size: '', allocatedTo: '', notes: '' })

  const items = (kits || []) as any[]

  const stats = useMemo(() => {
    const total = items.length
    const complete = items.filter((k: any) =>
      KIT_PARTS.every((p) => {
        const v = (k[p.key] || '').toLowerCase().trim()
        return v === 'y' || v === 'yes'
      })
    ).length
    const partial = items.filter((k: any) => {
      const parts = KIT_PARTS.map((p) => (k[p.key] || '').toLowerCase().trim())
      const hasY = parts.some((v) => v === 'y' || v === 'yes')
      const hasN = parts.some((v) => v === 'n' || v === 'no' || v === '')
      return hasY && hasN
    }).length
    const outstanding = items.filter((k: any) =>
      KIT_PARTS.some((p) => {
        const v = (k[p.key] || '').toLowerCase().trim()
        return v === 'o/s' || v === 'ordered'
      })
    ).length
    return { total, complete, partial, outstanding }
  }, [items])

  async function handlePartToggle(kit: any, partKey: string) {
    const newVal = nextStatus(kit[partKey] || '')
    await updateColdformKit(kit.id, { [partKey]: newVal })
    mutate()
  }

  async function handleSaveEdit() {
    if (!editingId) return
    await updateColdformKit(editingId, editData)
    setEditingId(null)
    setEditData({})
    mutate()
  }

  async function handleAdd() {
    if (!newKit.size && !newKit.allocatedTo) return
    await createColdformKit({
      ...newKit,
      walls: 'N',
      tunnel: 'N',
      floor: 'N',
      headBoard: 'N',
      tailGate: 'N',
      splashGuards: 'N',
      lightStrips: 'N',
      position: items.length,
    })
    setNewKit({ size: '', allocatedTo: '', notes: '' })
    setAdding(false)
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this kit entry?')) return
    await deleteColdformKit(id)
    mutate()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Kits" value={stats.total} color="#3b9de8" />
        <StatCard label="Complete" value={stats.complete} color="#22d07a" />
        <StatCard label="Partial" value={stats.partial} color="#f5a623" />
        <StatCard label="Outstanding" value={stats.outstanding} color="#e84560" />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
              <th style={thStyle}>Size</th>
              {KIT_PARTS.map((p) => (
                <th key={p.key} style={{ ...thStyle, textAlign: 'center', minWidth: 70 }}>
                  {p.label}
                </th>
              ))}
              <th style={thStyle}>Allocated To</th>
              <th style={thStyle}>Notes</th>
              <th style={{ ...thStyle, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((kit: any) => {
              const isEditing = editingId === kit.id
              const allDone = KIT_PARTS.every((p) => {
                const v = (kit[p.key] || '').toLowerCase().trim()
                return v === 'y' || v === 'yes'
              })
              return (
                <tr
                  key={kit.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: allDone ? 'rgba(34,208,122,0.06)' : 'transparent',
                  }}
                >
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.size ?? kit.size}
                        onChange={(e) => setEditData({ ...editData, size: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <span style={{ fontWeight: 600, color: '#fff' }}>{kit.size || '\u2014'}</span>
                    )}
                  </td>
                  {KIT_PARTS.map((p) => {
                    const val = kit[p.key] || ''
                    return (
                      <td key={p.key} style={{ ...tdStyle, textAlign: 'center' }}>
                        <div
                          onClick={() => handlePartToggle(kit, p.key)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 28,
                            borderRadius: 4,
                            background: statusColor(val),
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: '0.15s',
                            userSelect: 'none',
                          }}
                          title={`Click to toggle (currently: ${statusLabel(val)})`}
                        >
                          {statusLabel(val)}
                        </div>
                      </td>
                    )
                  })}
                  <td style={tdStyle}>
                    {isEditing ? (
                      <JobSelect value={editData.allocatedTo ?? kit.allocatedTo} onChange={(v) => setEditData({ ...editData, allocatedTo: v })} jobs={jobs} />
                    ) : (
                      <JobBadge num={kit.allocatedTo} jobs={jobs} />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.notes ?? kit.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        style={{ ...inputStyle, minWidth: 200 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>{kit.notes || ''}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={handleSaveEdit} style={btnSmall('#22d07a')}>
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditData({})
                          }}
                          style={btnSmall('rgba(255,255,255,0.2)')}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => {
                            setEditingId(kit.id)
                            setEditData({ size: kit.size, allocatedTo: kit.allocatedTo, notes: kit.notes })
                          }}
                          style={btnSmall('rgba(255,255,255,0.1)')}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(kit.id)} style={btnSmall('rgba(232,69,96,0.3)')} title="Delete">
                          X
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={labelStyle}>Size</label>
            <input
              value={newKit.size}
              onChange={(e) => setNewKit({ ...newKit, size: e.target.value })}
              placeholder="e.g. 4660x1000"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Allocated To</label>
            <JobSelect value={newKit.allocatedTo} onChange={(v) => setNewKit({ ...newKit, allocatedTo: v })} jobs={jobs} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input
              value={newKit.notes}
              onChange={(e) => setNewKit({ ...newKit, notes: e.target.value })}
              placeholder="Notes..."
              style={{ ...inputStyle, minWidth: 200 }}
            />
          </div>
          <button onClick={handleAdd} style={btnSmall('#22d07a')}>
            Add Kit
          </button>
          <button onClick={() => setAdding(false)} style={btnSmall('rgba(255,255,255,0.2)')}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 12,
            padding: '8px 18px',
            background: 'rgba(59,157,232,0.15)',
            border: '1px solid rgba(59,157,232,0.3)',
            borderRadius: 4,
            color: '#3b9de8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Hardox Kit
        </button>
      )}

      <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
          Legend
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
          <span>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#22d07a', marginRight: 4, verticalAlign: 'middle' }} />
            Y = Ready/In Stock
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#e84560', marginRight: 4, verticalAlign: 'middle' }} />
            N = Not Ready
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#f5a623', marginRight: 4, verticalAlign: 'middle' }} />
            O/S = On Order / Outstanding
          </span>
        </div>
      </div>
    </div>
  )
}

// ============== TRAILER CHASSIS TAB ==============
function TrailerChassisTab({ jobs }: { jobs: any[] }) {
  const { data: chassis, mutate } = useColdformChassis()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [adding, setAdding] = useState(false)
  const [newChassis, setNewChassis] = useState({ jobNo: '', chassisLength: '', dollyType: '', drawbar: '', dateNeeded: '', notes: '' })

  const items = (chassis || []) as any[]

  const CHASSIS_REF = [
    { body: '5300', chassis: '4950' },
    { body: '6000 / 6100', chassis: '5450' },
    { body: '7700', chassis: '7470' },
    { body: '8300', chassis: '7870' },
    { body: '9200', chassis: '9850' },
  ]

  async function handleSaveEdit() {
    if (!editingId) return
    await updateColdformChassis(editingId, editData)
    setEditingId(null)
    setEditData({})
    mutate()
  }

  async function handleAdd() {
    if (!newChassis.jobNo) return
    await createColdformChassis({
      ...newChassis,
      position: items.length,
    })
    setNewChassis({ jobNo: '', chassisLength: '', dollyType: '', drawbar: '', dateNeeded: '', notes: '' })
    setAdding(false)
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this chassis entry?')) return
    await deleteColdformChassis(id)
    mutate()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Total Orders" value={items.length} color="#3b9de8" />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
              <th style={thStyle}>Job No</th>
              <th style={thStyle}>Chassis Length</th>
              <th style={thStyle}>Dolly Type</th>
              <th style={thStyle}>Drawbar</th>
              <th style={thStyle}>Date Needed</th>
              <th style={thStyle}>Notes</th>
              <th style={{ ...thStyle, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c: any) => {
              const isEditing = editingId === c.id
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <JobSelect value={editData.jobNo ?? c.jobNo} onChange={(v) => setEditData({ ...editData, jobNo: v })} jobs={jobs} />
                    ) : (
                      <JobBadge num={c.jobNo} jobs={jobs} />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.chassisLength ?? c.chassisLength}
                        onChange={(e) => setEditData({ ...editData, chassisLength: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <span style={{ color: '#fff', fontWeight: 500 }}>{c.chassisLength || '\u2014'}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.dollyType ?? c.dollyType}
                        onChange={(e) => setEditData({ ...editData, dollyType: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <span style={{ color: 'var(--text2)' }}>{c.dollyType || '\u2014'}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.drawbar ?? c.drawbar}
                        onChange={(e) => setEditData({ ...editData, drawbar: e.target.value })}
                        style={{ ...inputStyle, minWidth: 180 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>{c.drawbar || '\u2014'}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.dateNeeded ?? c.dateNeeded}
                        onChange={(e) => setEditData({ ...editData, dateNeeded: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <span style={{ color: c.dateNeeded ? '#f5a623' : 'var(--text3)', fontWeight: c.dateNeeded ? 600 : 400 }}>
                        {c.dateNeeded || '\u2014'}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.notes ?? c.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        style={{ ...inputStyle, minWidth: 200 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>{c.notes || ''}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={handleSaveEdit} style={btnSmall('#22d07a')}>
                          Save
                        </button>
                        <button onClick={() => { setEditingId(null); setEditData({}) }} style={btnSmall('rgba(255,255,255,0.2)')}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => {
                            setEditingId(c.id)
                            setEditData({
                              jobNo: c.jobNo,
                              chassisLength: c.chassisLength,
                              dollyType: c.dollyType,
                              drawbar: c.drawbar,
                              dateNeeded: c.dateNeeded,
                              notes: c.notes,
                            })
                          }}
                          style={btnSmall('rgba(255,255,255,0.1)')}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(c.id)} style={btnSmall('rgba(232,69,96,0.3)')}>
                          X
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={labelStyle}>Job No</label>
            <JobSelect value={newChassis.jobNo} onChange={(v) => setNewChassis({ ...newChassis, jobNo: v })} jobs={jobs} />
          </div>
          <div>
            <label style={labelStyle}>Chassis Length</label>
            <input
              value={newChassis.chassisLength}
              onChange={(e) => setNewChassis({ ...newChassis, chassisLength: e.target.value })}
              placeholder="e.g. 8300"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Dolly Type</label>
            <input
              value={newChassis.dollyType}
              onChange={(e) => setNewChassis({ ...newChassis, dollyType: e.target.value })}
              placeholder="e.g. 4 axle"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Drawbar</label>
            <input
              value={newChassis.drawbar}
              onChange={(e) => setNewChassis({ ...newChassis, drawbar: e.target.value })}
              placeholder="Drawbar notes"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date Needed</label>
            <input
              type="date"
              value={newChassis.dateNeeded}
              onChange={(e) => setNewChassis({ ...newChassis, dateNeeded: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input
              value={newChassis.notes}
              onChange={(e) => setNewChassis({ ...newChassis, notes: e.target.value })}
              placeholder="Notes..."
              style={{ ...inputStyle, minWidth: 200 }}
            />
          </div>
          <button onClick={handleAdd} style={btnSmall('#22d07a')}>
            Add
          </button>
          <button onClick={() => setAdding(false)} style={btnSmall('rgba(255,255,255,0.2)')}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 12,
            padding: '8px 18px',
            background: 'rgba(59,157,232,0.15)',
            border: '1px solid rgba(59,157,232,0.3)',
            borderRadius: 4,
            color: '#3b9de8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Chassis Order
        </button>
      )}

      {/* Reference table */}
      <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>
          Body Length \u2192 Chassis Length Reference
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {CHASSIS_REF.map((r) => (
            <div
              key={r.body}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--text2)' }}>Body {r.body}</span>
              <span style={{ color: 'var(--text3)', margin: '0 6px' }}>{'\u2192'}</span>
              <span style={{ color: '#3b9de8', fontWeight: 600 }}>Chassis {r.chassis}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============== DELIVERY SCHEDULE TAB ==============
function DeliveryScheduleTab({ jobs }: { jobs: any[] }) {
  const { data: deliveries, mutate } = useColdformDeliveries()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [adding, setAdding] = useState(false)
  const [newDel, setNewDel] = useState({ date: '', hardoxJobs: '', chassisJobs: '', alloyJobs: '', notes: '' })

  const items = (deliveries || []) as any[]

  // Build a lookup map for job nums
  const jobMap = useMemo(() => {
    const m: Record<string, any> = {}
    jobs.forEach((j: any) => {
      m[j.num] = j
    })
    return m
  }, [jobs])

  function formatDate(dateStr: string): string {
    if (!dateStr) return '\u2014'
    try {
      const d = new Date(dateStr + 'T00:00:00')
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
    } catch {
      return dateStr
    }
  }

  function isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  function isPast(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0]
    return dateStr < today
  }

  // Render job numbers in a delivery cell, showing type from jobs list
  function DeliveryJobCell({ value, color }: { value: string; color: string }) {
    if (!value) return <span style={{ color: 'var(--text3)' }}>{'\u2014'}</span>
    // Could be comma-separated multiple jobs
    const nums = value.split(',').map((s) => s.trim()).filter(Boolean)
    return (
      <span>
        {nums.map((num, i) => {
          const job = jobMap[num]
          return (
            <span key={i}>
              {i > 0 && <span style={{ color: 'var(--text3)' }}>, </span>}
              <span style={{ color, fontWeight: 600 }}>{num}</span>
              {job && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 3 }}>({job.type})</span>}
            </span>
          )
        })}
      </span>
    )
  }

  async function handleSaveEdit() {
    if (!editingId) return
    await updateColdformDelivery(editingId, editData)
    setEditingId(null)
    setEditData({})
    mutate()
  }

  async function handleAdd() {
    if (!newDel.date) return
    await createColdformDelivery(newDel)
    setNewDel({ date: '', hardoxJobs: '', chassisJobs: '', alloyJobs: '', notes: '' })
    setAdding(false)
    mutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this delivery entry?')) return
    await deleteColdformDelivery(id)
    mutate()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Scheduled Deliveries" value={items.length} color="#3b9de8" />
        <StatCard label="With Hardox" value={items.filter((d: any) => d.hardoxJobs).length} color="#e84560" />
        <StatCard label="With Chassis" value={items.filter((d: any) => d.chassisJobs).length} color="#f5a623" />
        <StatCard label="With Alloy" value={items.filter((d: any) => d.alloyJobs).length} color="#22d07a" />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.15)' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Hardox Order</th>
              <th style={thStyle}>Trailer Chassis</th>
              <th style={thStyle}>Alloy</th>
              <th style={thStyle}>Notes</th>
              <th style={{ ...thStyle, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d: any) => {
              const isEditing = editingId === d.id
              const today = isToday(d.date)
              const past = isPast(d.date)
              const hasContent = d.hardoxJobs || d.chassisJobs || d.alloyJobs
              return (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: today
                      ? 'rgba(59,157,232,0.1)'
                      : past && hasContent
                      ? 'rgba(255,255,255,0.02)'
                      : 'transparent',
                    opacity: past && !hasContent ? 0.4 : 1,
                  }}
                >
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.date ?? d.date}
                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        style={inputStyle}
                      />
                    ) : (
                      <div>
                        <span style={{ fontWeight: 600, color: today ? '#3b9de8' : '#fff' }}>{formatDate(d.date)}</span>
                        {today && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: 1,
                              padding: '2px 6px',
                              borderRadius: 3,
                              background: '#3b9de8',
                              color: '#fff',
                            }}
                          >
                            TODAY
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.hardoxJobs ?? d.hardoxJobs}
                        onChange={(e) => setEditData({ ...editData, hardoxJobs: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. YLZ1083"
                      />
                    ) : (
                      <DeliveryJobCell value={d.hardoxJobs} color="#e84560" />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.chassisJobs ?? d.chassisJobs}
                        onChange={(e) => setEditData({ ...editData, chassisJobs: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. YLZ994"
                      />
                    ) : (
                      <DeliveryJobCell value={d.chassisJobs} color="#f5a623" />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.alloyJobs ?? d.alloyJobs}
                        onChange={(e) => setEditData({ ...editData, alloyJobs: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. YLZ994"
                      />
                    ) : (
                      <DeliveryJobCell value={d.alloyJobs} color="#22d07a" />
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <input
                        value={editData.notes ?? d.notes}
                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                        style={{ ...inputStyle, minWidth: 150 }}
                      />
                    ) : (
                      <span style={{ color: 'var(--text2)', fontSize: 12 }}>{d.notes || ''}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={handleSaveEdit} style={btnSmall('#22d07a')}>Save</button>
                        <button onClick={() => { setEditingId(null); setEditData({}) }} style={btnSmall('rgba(255,255,255,0.2)')}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => {
                            setEditingId(d.id)
                            setEditData({ date: d.date, hardoxJobs: d.hardoxJobs, chassisJobs: d.chassisJobs, alloyJobs: d.alloyJobs, notes: d.notes })
                          }}
                          style={btnSmall('rgba(255,255,255,0.1)')}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(d.id)} style={btnSmall('rgba(232,69,96,0.3)')}>X</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={newDel.date} onChange={(e) => setNewDel({ ...newDel, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Hardox Jobs</label>
            <input value={newDel.hardoxJobs} onChange={(e) => setNewDel({ ...newDel, hardoxJobs: e.target.value })} placeholder="YLZ1083" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Chassis Jobs</label>
            <input value={newDel.chassisJobs} onChange={(e) => setNewDel({ ...newDel, chassisJobs: e.target.value })} placeholder="YLZ994" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Alloy Jobs</label>
            <input value={newDel.alloyJobs} onChange={(e) => setNewDel({ ...newDel, alloyJobs: e.target.value })} placeholder="YLZ994" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input value={newDel.notes} onChange={(e) => setNewDel({ ...newDel, notes: e.target.value })} placeholder="Notes..." style={inputStyle} />
          </div>
          <button onClick={handleAdd} style={btnSmall('#22d07a')}>Add</button>
          <button onClick={() => setAdding(false)} style={btnSmall('rgba(255,255,255,0.2)')}>Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 12,
            padding: '8px 18px',
            background: 'rgba(59,157,232,0.15)',
            border: '1px solid rgba(59,157,232,0.3)',
            borderRadius: 4,
            color: '#3b9de8',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Delivery
        </button>
      )}
    </div>
  )
}

// ============== MAIN PAGE ==============
export default function ColdformPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('Hardox Kits')
  const { data: allJobs } = useJobs()
  const { data: kits } = useColdformKits()
  const { data: chassis } = useColdformChassis()
  const { data: deliveries } = useColdformDeliveries()

  const jobs = (allJobs || []) as any[]
  // Sort jobs by num for the dropdowns
  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => a.num.localeCompare(b.num, undefined, { numeric: true })), [jobs])

  const handlePrint = useCallback(() => {
    const kitItems = (kits || []) as any[]
    const chassisItems = (chassis || []) as any[]
    const deliveryItems = (deliveries || []) as any[]
    const jobMap: Record<string, any> = {}
    sortedJobs.forEach((j) => { jobMap[j.num] = j })

    function jobLabel(num: string): string {
      if (!num) return '\u2014'
      const j = jobMap[num]
      return j ? `${num} (${j.type})` : num
    }

    let content = ''

    if (activeTab === 'Hardox Kits') {
      content = `
        <h2>Hardox Kits \u2014 Stock & Orders</h2>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Walls</th>
              <th>Tunnel</th>
              <th>Floor</th>
              <th>Head Board</th>
              <th>Tail Gate</th>
              <th>Splash Guards</th>
              <th>Light Strips</th>
              <th>Allocated To</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${kitItems
              .map(
                (k: any) => `
              <tr>
                <td style="font-weight:600">${k.size || '\u2014'}</td>
                ${['walls', 'tunnel', 'floor', 'headBoard', 'tailGate', 'splashGuards', 'lightStrips']
                  .map((p) => {
                    const v = (k[p] || '').toLowerCase().trim()
                    const bg = v === 'y' || v === 'yes' ? '#22d07a' : v === 'n' || v === 'no' ? '#e84560' : v === 'o/s' ? '#f5a623' : '#ccc'
                    const label = v === 'y' || v === 'yes' ? 'Y' : v === 'n' || v === 'no' ? 'N' : v === 'o/s' ? 'O/S' : k[p] || '\u2014'
                    return `<td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:3px;background:${bg};color:#fff;font-weight:700;font-size:11px">${label}</span></td>`
                  })
                  .join('')}
                <td style="color:#2a7dd4;font-weight:600">${jobLabel(k.allocatedTo)}</td>
                <td style="font-size:11px;color:#666">${k.notes || ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
    } else if (activeTab === 'Trailer Chassis') {
      content = `
        <h2>Trailer Chassis Orders</h2>
        <table>
          <thead>
            <tr>
              <th>Job No</th>
              <th>Chassis Length</th>
              <th>Dolly Type</th>
              <th>Drawbar</th>
              <th>Date Needed</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${chassisItems
              .map(
                (c: any) => `
              <tr>
                <td style="font-weight:600;color:#2a7dd4">${jobLabel(c.jobNo)}</td>
                <td>${c.chassisLength || '\u2014'}</td>
                <td>${c.dollyType || '\u2014'}</td>
                <td style="font-size:11px">${c.drawbar || '\u2014'}</td>
                <td style="color:#d4920a;font-weight:600">${c.dateNeeded || '\u2014'}</td>
                <td style="font-size:11px;color:#666">${c.notes || ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
    } else {
      content = `
        <h2>Coldform Delivery Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Hardox Order</th>
              <th>Trailer Chassis</th>
              <th>Alloy</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${deliveryItems
              .map((d: any) => {
                let dateLabel = d.date
                try {
                  const dt = new Date(d.date + 'T00:00:00')
                  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                  dateLabel = `${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]}`
                } catch {}
                return `
              <tr>
                <td style="font-weight:600">${dateLabel}</td>
                <td style="color:${d.hardoxJobs ? '#c0392b' : '#999'};font-weight:${d.hardoxJobs ? '600' : '400'}">${d.hardoxJobs ? jobLabel(d.hardoxJobs) : '\u2014'}</td>
                <td style="color:${d.chassisJobs ? '#d4920a' : '#999'};font-weight:${d.chassisJobs ? '600' : '400'}">${d.chassisJobs ? jobLabel(d.chassisJobs) : '\u2014'}</td>
                <td style="color:${d.alloyJobs ? '#27ae60' : '#999'};font-weight:${d.alloyJobs ? '600' : '400'}">${d.alloyJobs ? jobLabel(d.alloyJobs) : '\u2014'}</td>
                <td style="font-size:11px;color:#666">${d.notes || ''}</td>
              </tr>
            `
              })
              .join('')}
          </tbody>
        </table>
      `
    }

    const html = `<!DOCTYPE html><html><head><title>Coldform \u2014 ${activeTab}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 22px; font-weight: 800; letter-spacing: 2px; }
        h2 { font-size: 16px; font-weight: 700; margin: 16px 0 10px; color: #333; }
        .meta { font-size: 11px; color: #888; margin: 4px 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #333; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e0e0e0; }
        @media print { @page { size: landscape; margin: 12mm; } }
      </style>
    </head><body>
      <h1>YLZ WORKSHOP</h1>
      <div class="meta">Coldform \u2014 ${activeTab} &nbsp;|&nbsp; Printed ${new Date().toLocaleDateString('en-AU')} ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
      ${content}
    </body></html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.onload = () => w.print()
    }
  }, [activeTab, kits, chassis, deliveries, sortedJobs])

  return (
    <div style={{ padding: 24, flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <h1
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1,
              color: '#fff',
              margin: 0,
            }}
          >
            Coldform \u2014 Steel Processing
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Track hardox kits, trailer chassis orders & delivery schedule from Coldform
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handlePrint}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '8px 16px',
              borderRadius: 3,
              cursor: 'pointer',
              border: '1.5px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              transition: '0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--text2)'
            }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {TABS.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.45)',
              borderBottom: activeTab === tab ? '2px solid #3b9de8' : '2px solid transparent',
              transition: '0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
            }}
          >
            {tab === 'Hardox Kits' && '\uD83D\uDD29 '}
            {tab === 'Trailer Chassis' && '\uD83D\uDE9B '}
            {tab === 'Delivery Schedule' && '\uD83D\uDCC5 '}
            {tab}
          </div>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Hardox Kits' && <HardoxKitsTab jobs={sortedJobs} />}
      {activeTab === 'Trailer Chassis' && <TrailerChassisTab jobs={sortedJobs} />}
      {activeTab === 'Delivery Schedule' && <DeliveryScheduleTab jobs={sortedJobs} />}
    </div>
  )
}

// Shared styles
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  whiteSpace: 'nowrap',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  minWidth: 100,
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  minWidth: 180,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 4,
}

function btnSmall(bg: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    background: bg,
    border: 'none',
    borderRadius: 3,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
