'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useUsers } from '@/lib/hooks'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const SCREEN_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'keithschedule', label: "Keith's Schedule" },
  { key: 'jobboard', label: 'Job Board' },
  { key: 'floor', label: 'Workshop Floor' },
  { key: 'qa', label: 'QA Checklist' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'timesheet', label: 'Time Logging' },
  { key: 'cashflow', label: 'Cashflow & Deliveries' },
  { key: 'coldform', label: 'Coldform' },
  { key: 'mrp-tools', label: 'MRP Tools' },
  { key: 'reports', label: 'Reports' },
  { key: 'quotes', label: 'Sales / Quoting' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'repairs', label: 'Repairs / Warranty' },
]

const COLOR_SWATCHES = [
  '#e2e2e2', '#22d07a', '#3b9de8', '#a78bfa', '#f5a623', '#e84560', '#8aaec6', '#9b6dff',
]

const TABS = ['Users & Access', 'Sections', 'Checklists', 'Supervisors', 'Job Flows', 'Staff', 'Templates', 'System']

function SeedButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  async function run() {
    setState('loading')
    try {
      const r = await fetch('/api/templates/seed', { method: 'POST' })
      const d = await r.json()
      setMsg(d.message || 'Done')
      setState('done')
    } catch {
      setMsg('Failed — try again')
      setState('error')
    }
  }
  return (
    <div style={{ textAlign: 'right' }}>
      <button
        onClick={run}
        disabled={state === 'loading'}
        style={{
          background: state === 'done' ? '#22d07a' : state === 'error' ? '#e84560' : '#E8681A',
          color: '#fff', border: 'none', borderRadius: 4,
          padding: '10px 20px', fontWeight: 700, fontSize: 13,
          cursor: state === 'loading' ? 'wait' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {state === 'loading' ? 'Seeding…' : state === 'done' ? '✓ Done' : 'Reseed Now'}
      </button>
      {msg && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{msg}</div>}
    </div>
  )
}

interface ProductTemplate {
  id: string
  name: string
  category: string
  imagePath: string
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/templates').then(r => r.json()).then(setTemplates)
  }, [])

  async function saveImage(id: string) {
    setSaving(s => ({ ...s, [id]: true }))
    await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagePath: editing[id] }),
    })
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, imagePath: editing[id] } : t))
    setSaving(s => ({ ...s, [id]: false }))
    setSaved(s => ({ ...s, [id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000)
  }

  const CATEGORY_LABELS: Record<string, string> = {
    'quick-quote': 'Quick Quote',
    'truck-body': 'Truck Body',
    'trailer': 'Trailer',
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
        Paste any public image URL to update the photo shown in the quote builder. Use images from your website, Dropbox, Google Drive (share link), or anywhere publicly accessible.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {templates.map(t => {
          const imgSrc = editing[t.id] !== undefined ? editing[t.id] : t.imagePath
          return (
            <div key={t.id} style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#111', borderRadius: 6, border: '1px solid var(--border)', padding: 14 }}>
              {/* Preview */}
              <div style={{ width: 90, height: 66, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: '#1a1a1a', border: '1px solid var(--border)' }}>
                {imgSrc
                  ? <img src={imgSrc} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: 0.2 }}>🚛</div>
                }
              </div>
              {/* Info + input */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{CATEGORY_LABELS[t.category] || t.category}</div>
                <input
                  value={editing[t.id] !== undefined ? editing[t.id] : t.imagePath}
                  onChange={e => setEditing(ed => ({ ...ed, [t.id]: e.target.value }))}
                  placeholder="Paste image URL…"
                  style={{
                    width: '100%', background: '#0a0a0a', border: '1px solid var(--border2)',
                    borderRadius: 4, color: '#fff', padding: '7px 10px', fontSize: 12,
                  }}
                />
              </div>
              {/* Save button */}
              <button
                onClick={() => saveImage(t.id)}
                disabled={saving[t.id] || editing[t.id] === undefined || editing[t.id] === t.imagePath}
                style={{
                  background: saved[t.id] ? '#22d07a' : '#E8681A',
                  color: '#fff', border: 'none', borderRadius: 4,
                  padding: '8px 16px', fontWeight: 700, fontSize: 12,
                  cursor: saving[t.id] ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                  opacity: (!saving[t.id] && editing[t.id] !== undefined && editing[t.id] !== t.imagePath) ? 1 : 0.4,
                }}
              >
                {saved[t.id] ? '✓ Saved' : saving[t.id] ? 'Saving…' : 'Save'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface UserForm {
  id?: string
  name: string
  role: string
  pin: string
  color: string
  access: string[]
  defaultScreen: string
  section: string
  canAdvance: boolean
  canEdit: boolean
  fullAdmin: boolean
}

const emptyForm: UserForm = {
  name: '',
  role: '',
  pin: '',
  color: '#e2e2e2',
  access: ['dashboard'],
  defaultScreen: 'dashboard',
  section: '',
  canAdvance: false,
  canEdit: false,
  fullAdmin: false,
}

// Sortable screen item for drag-and-drop reordering
function SortableScreenItem({
  screenKey,
  label,
  checked,
  onToggle,
}: {
  screenKey: string
  label: string
  checked: boolean
  onToggle: (checked: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: screenKey,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: isDragging
      ? 'rgba(255,255,255,0.12)'
      : checked
        ? 'rgba(255,255,255,0.06)'
        : 'transparent',
    borderRadius: 4,
    border: `1px solid ${isDragging ? 'rgba(255,255,255,0.3)' : checked ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 10 : 1,
    cursor: 'default',
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: 'var(--text3)',
          fontSize: 14,
          lineHeight: 1,
          padding: '2px 0',
          touchAction: 'none',
        }}
        title="Drag to reorder"
      >
        ☰
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 500,
          color: checked ? '#fff' : 'var(--text3)',
          cursor: 'pointer',
          flex: 1,
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ accentColor: 'var(--accent)' }}
        />
        {label}
      </label>
      {checked && (
        <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, letterSpacing: 0.5 }}>
          ON
        </span>
      )}
    </div>
  )
}

export default function ConfigurePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: users, mutate } = useUsers()
  const [activeTab, setActiveTab] = useState('Users & Access')
  const [editing, setEditing] = useState<UserForm | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    if (session && !session.user.fullAdmin) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (!session?.user?.fullAdmin) return null

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      if (editing.id) {
        // Update
        await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing),
        })
        setMessage('User updated')
      } else {
        // Create
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing),
        })
        setMessage('User created')
      }
      mutate()
      setShowForm(false)
      setEditing(null)
    } catch {
      setMessage('Failed to save')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleDelete(userId: string) {
    if (userId === 'nathan') {
      setMessage("Nathan's account cannot be deleted")
      setTimeout(() => setMessage(''), 3000)
      return
    }
    if (!confirm('Delete this user?')) return
    await fetch(`/api/users?id=${userId}`, { method: 'DELETE' })
    mutate()
    setMessage('User deleted')
    setTimeout(() => setMessage(''), 3000)
  }

  // Build ordered screen list: enabled items in access order first, then disabled items
  function getOrderedScreens(): string[] {
    if (!editing) return SCREEN_OPTIONS.map((s) => s.key)
    const enabled = editing.access.filter((k) => SCREEN_OPTIONS.some((s) => s.key === k))
    const disabled = SCREEN_OPTIONS.filter((s) => !editing.access.includes(s.key)).map((s) => s.key)
    return [...enabled, ...disabled]
  }

  function handleScreenDragEnd(event: DragEndEvent) {
    if (!editing) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ordered = getOrderedScreens()
    const oldIndex = ordered.indexOf(active.id as string)
    const newIndex = ordered.indexOf(over.id as string)
    const reordered = arrayMove(ordered, oldIndex, newIndex)

    // Rebuild access: only the enabled keys, in the new order
    const newAccess = reordered.filter((k) => editing.access.includes(k))
    setEditing({ ...editing, access: newAccess })
  }

  function handleScreenToggle(key: string, checked: boolean) {
    if (!editing) return
    if (checked) {
      setEditing({ ...editing, access: [...editing.access, key] })
    } else {
      setEditing({ ...editing, access: editing.access.filter((a) => a !== key) })
    }
  }

  const screenLookup: Record<string, string> = {}
  SCREEN_OPTIONS.forEach((s) => {
    screenLookup[s.key] = s.label
  })

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

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'var(--text3)',
    marginBottom: 6,
    display: 'block',
  }

  return (
    <div>
      <div
        style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            CONFIGURE
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Admin settings — users, sections, and workflows
          </div>
        </div>
        <button
          onClick={() => router.back()}
          style={{
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
            minHeight: 36,
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: 3,
                cursor: 'pointer',
                border: `1.5px solid ${activeTab === tab ? 'rgba(255,255,255,0.12)' : 'var(--border2)'}`,
                background: activeTab === tab ? 'var(--btn-primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text2)',
                transition: '0.15s',
                minHeight: 36,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {message && (
          <div
            style={{
              padding: '10px 16px',
              marginBottom: 16,
              borderRadius: 4,
              background: message.includes('Failed') || message.includes('cannot') ? 'var(--red-bg)' : 'var(--green-bg)',
              color: message.includes('Failed') || message.includes('cannot') ? 'var(--red)' : 'var(--green)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {activeTab === 'Users & Access' ? (
          <div>
            {/* Add User Button */}
            {!showForm && (
              <button
                onClick={() => {
                  setEditing({ ...emptyForm })
                  setShowForm(true)
                }}
                style={{
                  marginBottom: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  padding: '10px 20px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'var(--btn-primary)',
                  color: '#fff',
                  minHeight: 44,
                }}
              >
                + Add User
              </button>
            )}

            {/* User Form */}
            {showForm && editing && (
              <div
                style={{
                  background: 'var(--dark2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
                  {editing.id ? 'EDIT USER' : 'NEW USER'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      style={inputStyle}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Role</label>
                    <input
                      value={editing.role}
                      onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                      style={inputStyle}
                      placeholder="e.g. QC Supervisor"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>4-Digit PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={editing.pin}
                      onChange={(e) => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      style={inputStyle}
                      placeholder="••••"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>Section (optional)</label>
                    <input
                      value={editing.section}
                      onChange={(e) => setEditing({ ...editing, section: e.target.value })}
                      style={inputStyle}
                      placeholder="e.g. QC, Alloy, Steel"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Default Screen</label>
                    <select
                      value={editing.defaultScreen}
                      onChange={(e) => setEditing({ ...editing, defaultScreen: e.target.value })}
                      style={inputStyle}
                    >
                      {SCREEN_OPTIONS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Picker */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Colour</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {COLOR_SWATCHES.map((c) => (
                      <div
                        key={c}
                        onClick={() => setEditing({ ...editing, color: c })}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: c,
                          cursor: 'pointer',
                          border: editing.color === c ? '3px solid #fff' : '3px solid transparent',
                          transition: '0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Screen Access — Draggable List */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>
                    Screen Access
                    <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', marginLeft: 8, color: 'rgba(255,255,255,0.3)' }}>
                      drag ☰ to reorder sidebar
                    </span>
                  </label>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleScreenDragEnd}
                  >
                    <SortableContext
                      items={getOrderedScreens()}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 400 }}>
                        {(() => {
                          const ordered = getOrderedScreens()
                          const enabledKeys = editing.access
                          const enabledItems = ordered.filter((k) => enabledKeys.includes(k))
                          const disabledItems = ordered.filter((k) => !enabledKeys.includes(k))
                          return (
                            <>
                              {enabledItems.map((key) => (
                                <SortableScreenItem
                                  key={key}
                                  screenKey={key}
                                  label={screenLookup[key] || key}
                                  checked={true}
                                  onToggle={(checked) => handleScreenToggle(key, checked)}
                                />
                              ))}
                              {enabledItems.length > 0 && disabledItems.length > 0 && (
                                <div style={{
                                  borderTop: '1px solid var(--border)',
                                  margin: '4px 0',
                                  paddingTop: 4,
                                }}>
                                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
                                    Available
                                  </span>
                                </div>
                              )}
                              {disabledItems.map((key) => (
                                <SortableScreenItem
                                  key={key}
                                  screenKey={key}
                                  label={screenLookup[key] || key}
                                  checked={false}
                                  onToggle={(checked) => handleScreenToggle(key, checked)}
                                />
                              ))}
                            </>
                          )
                        })()}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Permissions */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Permissions</label>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { key: 'canAdvance', label: 'Can Advance Stages' },
                      { key: 'canEdit', label: 'Can Edit Jobs' },
                      { key: 'fullAdmin', label: 'Full Admin' },
                    ].map((p) => (
                      <label
                        key={p.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(editing as any)[p.key]}
                          onChange={(e) => setEditing({ ...editing, [p.key]: e.target.checked })}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editing.name || !editing.role || (!editing.id && editing.pin.length !== 4)}
                    style={{
                      padding: '10px 24px',
                      background: 'var(--btn-primary)',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                      borderRadius: 3,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      minHeight: 44,
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Saving...' : editing.id ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setEditing(null) }}
                    style={{
                      padding: '10px 24px',
                      background: 'transparent',
                      border: '1.5px solid var(--border2)',
                      borderRadius: 3,
                      color: 'var(--text2)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* User Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {users?.map((u: any) => {
                // Show access labels in order
                const accessLabels = u.access.map((k: string) => screenLookup[k] || k)
                return (
                  <div
                    key={u.id}
                    style={{
                      background: 'var(--dark2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '16px',
                      borderLeft: `4px solid ${u.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: u.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {u.name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.role}</div>
                      </div>
                      {u.fullAdmin && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.08)',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
                      Screens: {accessLabels.join(', ')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 8 }}>
                      Permissions: {[u.canAdvance && 'Advance', u.canEdit && 'Edit', u.fullAdmin && 'Admin'].filter(Boolean).join(', ') || 'View only'}
                      {u.section && ` · Section: ${u.section}`}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditing({
                            id: u.id,
                            name: u.name,
                            role: u.role,
                            pin: '',
                            color: u.color,
                            access: u.access,
                            defaultScreen: u.defaultScreen,
                            section: u.section || '',
                            canAdvance: u.canAdvance,
                            canEdit: u.canEdit,
                            fullAdmin: u.fullAdmin,
                          })
                          setShowForm(true)
                        }}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: 2,
                          cursor: 'pointer',
                          border: '1px solid var(--border2)',
                          background: 'transparent',
                          color: 'var(--text2)',
                          minHeight: 32,
                        }}
                      >
                        Edit
                      </button>
                      {u.id !== 'nathan' && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '4px 12px',
                            borderRadius: 2,
                            cursor: 'pointer',
                            border: '1px solid rgba(232,69,96,0.3)',
                            background: 'transparent',
                            color: 'var(--red)',
                            minHeight: 32,
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : activeTab === 'Templates' ? (
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Quote Template Photos</div>
            <TemplatesTab />
          </div>
        ) : activeTab === 'System' ? (
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20 }}>System Tools</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#111', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Reseed Quote Templates</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Reloads all product templates and image paths into the database. Use after a code update.</div>
              </div>
              <SeedButton />
            </div>
          </div>
        ) : (
          /* Placeholder for other tabs */
          <div
            style={{
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 48,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              {activeTab} configuration — coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
