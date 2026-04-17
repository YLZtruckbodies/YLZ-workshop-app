'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { UndoProvider, useUndo } from '@/lib/undo-context'
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', section: 'BOARDS' },
  { key: 'analytics', label: 'Analytics', icon: '📈', section: 'BOARDS' },
  { key: 'keithschedule', label: "Keith's Schedule", icon: '📋', section: 'BOARDS' },
  { key: 'jobboard', label: 'Job Board', icon: '🏭', section: 'BOARDS' },
  { key: 'timeline', label: 'Timeline', icon: '📅', section: 'BOARDS' },
  { key: 'calendar', label: 'Calendar', icon: '🗓', section: 'BOARDS' },
  { key: 'workload', label: 'Workload', icon: '⚖️', section: 'BOARDS' },
  { key: 'floor', label: 'Workshop Floor', icon: '🔧', section: 'TOOLS' },
  { key: 'jobfollower', label: 'Job Follower', icon: '📝', section: 'TOOLS' },
  { key: 'qa', label: 'QA Checklist', icon: '✅', section: 'TOOLS' },
  { key: 'notifications', label: 'Notifications', icon: '🔔', section: 'TOOLS' },
  { key: 'timesheet', label: 'Time Logging', icon: '⏱', section: 'TOOLS' },
  { key: 'cashflow', label: 'Cashflow & Deliveries', icon: '💰', section: 'TOOLS' },
  { key: 'coldform', label: 'Coldform', icon: '🔩', section: 'TOOLS' },
  { key: 'mrp-tools', label: 'MRP Tools', icon: '⚙️', section: 'TOOLS' },
  { key: 'reports', label: 'Reports', icon: '📋', section: 'TOOLS' },
  { key: 'quotes', label: 'Sales / Quoting', icon: '💲', section: 'TOOLS' },
  { key: 'engineering', label: 'Engineering', icon: '📐', section: 'TOOLS' },
  { key: 'repairs', label: 'Repairs / Warranty', icon: '🛠', section: 'TOOLS' },
  { key: 'jobmaster', label: 'Job Sheet Master', icon: '📒', section: 'TOOLS' },
  { key: 'whs', label: 'WHS Forms', icon: '🦺', section: 'TOOLS' },
  { key: 'completed', label: 'Completed Jobs', icon: '✅', section: 'TOOLS' },
]

function SortableSidebarItem({
  itemKey,
  label,
  icon,
  active,
  reordering,
  onClick,
  badge,
}: {
  itemKey: string
  label: string
  icon: string
  active: boolean
  reordering: boolean
  onClick: () => void
  badge?: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
    disabled: !reordering,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 18px',
    cursor: reordering ? 'grab' : 'pointer',
    borderLeft: `3px solid ${active ? '#fff' : 'transparent'}`,
    background: isDragging
      ? 'rgba(255,255,255,0.12)'
      : active
        ? 'rgba(255,255,255,0.06)'
        : 'transparent',
    fontSize: 13,
    fontWeight: 500,
    color: isDragging ? '#fff' : active ? '#fff' : 'rgba(255,255,255,0.55)',
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (!reordering) onClick()
      }}
      onMouseEnter={(e) => {
        if (!active && !isDragging && !reordering) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.color = '#fff'
        }
      }}
      onMouseLeave={(e) => {
        if (!active && !isDragging) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.55)'
        }
      }}
      {...(reordering ? { ...attributes, ...listeners } : {})}
    >
      <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          background: '#E8681A', color: '#fff', fontSize: 9, fontWeight: 800,
          borderRadius: 10, padding: '1px 6px', minWidth: 16, textAlign: 'center',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UndoProvider>
      <style>{`
        @media print {
          .app-topbar, .app-sidebar, .app-reorder-btn { display: none !important; }
          .app-grid {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          .app-main {
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>
      <AppLayoutInner>{children}</AppLayoutInner>
    </UndoProvider>
  )
}

// ─── Search Modal ─────────────────────────────────────────────────────────────
function SearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ jobs: any[]; quotes: any[] }>({ jobs: [], quotes: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (q.length < 2) { setResults({ jobs: [], quotes: [] }); return }
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => { setResults(d); setLoading(false) })
        .catch(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const STAGE_COLORS: Record<string, string> = {
    'Requires Engineering': '#f97316', 'Ready to Start': '#06b6d4',
    Fab: '#3b9de8', Paint: '#a259ff', Fitout: '#f5a623', QC: '#3b9de8', Dispatch: '#22d07a',
  }
  const STATUS_COLORS: Record<string, string> = {
    draft: '#888', sent: '#3b82f6', accepted: '#22c55e', declined: '#ef4444', expired: '#eab308',
  }

  const total = results.jobs.length + results.quotes.length

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 580, background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
            placeholder="Search jobs, customers, quotes..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: '#fff', fontFamily: 'inherit' }}
          />
          {loading && <span style={{ fontSize: 12, color: 'var(--text3)' }}>...</span>}
          <kbd style={{ fontSize: 10, color: 'var(--text3)', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 3 }}>ESC</kbd>
        </div>

        {/* Results */}
        {q.length >= 2 && (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {total === 0 && !loading && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No results for &ldquo;{q}&rdquo;
              </div>
            )}

            {results.jobs.length > 0 && (
              <div>
                <div style={{ padding: '10px 20px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
                  Jobs
                </div>
                {results.jobs.map((j: any) => (
                  <div
                    key={j.id}
                    onClick={() => { router.push('/jobboard'); onClose() }}
                    style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#E8681A', minWidth: 90 }}>{j.num}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{j.customer}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{j.type}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: `${STAGE_COLORS[j.stage] || '#888'}22`, color: STAGE_COLORS[j.stage] || '#888', border: `1px solid ${STAGE_COLORS[j.stage] || '#888'}44` }}>
                      {j.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {results.quotes.length > 0 && (
              <div>
                <div style={{ padding: '10px 20px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
                  Quotes
                </div>
                {results.quotes.map((q_: any) => (
                  <div
                    key={q_.id}
                    onClick={() => { router.push(`/quotes/builder?id=${q_.id}`); onClose() }}
                    style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#E8681A', minWidth: 90 }}>{q_.quoteNumber}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)' }}>{q_.customerName}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{q_.buildType}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: `${STATUS_COLORS[q_.status] || '#888'}22`, color: STATUS_COLORS[q_.status] || '#888', border: `1px solid ${STATUS_COLORS[q_.status] || '#888'}44` }}>
                      {q_.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {q.length < 2 && (
          <div style={{ padding: '16px 20px', fontSize: 12, color: 'var(--text3)' }}>
            Type to search jobs, customers, or quotes...
          </div>
        )}
      </div>
    </div>
  )
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState('')
  const [reordering, setReordering] = useState(false)
  const [localAccess, setLocalAccess] = useState<string[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { canUndo, undoLabel, pushUndo, undo, clearUndo } = useUndo()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    setCurrentPath(window.location.pathname.replace(/^\//, ''))
  }, [])

  // Cmd+K / Ctrl+K global search shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Poll unread notification count
  useEffect(() => {
    if (!session?.user?.id) return
    function fetchUnread() {
      fetch(`/api/notifications?userId=${session!.user.id}&unreadOnly=true`)
        .then(r => r.json())
        .then((d: any[]) => setUnreadCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [session?.user?.id])

  // Sync local access state when session changes
  useEffect(() => {
    if (session?.user?.access && !localAccess) {
      setLocalAccess([...(session.user.access || [])])
    }
  }, [session, localAccess])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const user = session.user
  // Use local access state if available (for optimistic reordering), otherwise session
  const rawAccess = localAccess || [...(user.access || [])]
  // Backward compat: users with old 'production' or 'jobs' access get 'jobboard'
  const effectiveAccess = [...rawAccess]
  if ((effectiveAccess.includes('production') || effectiveAccess.includes('jobs')) && !effectiveAccess.includes('jobboard')) {
    effectiveAccess.push('jobboard')
  }
  // Build sidebar items in the order stored in user's access array
  const navLookup: Record<string, (typeof NAV_ITEMS)[0]> = {}
  NAV_ITEMS.forEach((n) => { navLookup[n.key] = n })
  const accessItems = effectiveAccess.map((key) => navLookup[key]).filter(Boolean)

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = effectiveAccess.indexOf(active.id as string)
    const newIndex = effectiveAccess.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(effectiveAccess, oldIndex, newIndex)
    const previousAccess = [...effectiveAccess]
    // Push undo action to global context
    pushUndo({
      label: 'Reorder sidebar',
      execute: async () => {
        setLocalAccess(previousAccess)
        try {
          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, access: previousAccess }),
          })
          updateSession()
        } catch {
          setLocalAccess([...(user.access || [])])
        }
      },
    })
    // Optimistic update
    setLocalAccess(reordered)

    // Save to DB
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, access: reordered }),
      })
      // Refresh session so JWT picks up new order
      updateSession()
    } catch {
      // Revert on error
      setLocalAccess([...(user.access || [])])
    }
  }

  return (
    <div
      className="app-grid"
      style={{
        display: 'grid',
        gridTemplateRows: '68px 1fr',
        gridTemplateColumns: '220px 1fr',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <div
        className="app-topbar"
        style={{
          gridColumn: '1 / -1',
          background: '#000',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          zIndex: 50,
        }}
      >
        <img src="/images/ylz-logo.webp" alt="YLZ" style={{ height: 60, objectFit: 'contain' }} />
        <div style={{ width: 1, height: 28, background: 'var(--border2)' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3 }}>
          YLZ Truck Bodies — Production Management
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            title="Search (Ctrl+K)"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
              border: '1.5px solid var(--border2)', background: 'transparent',
              color: 'var(--text3)', transition: '0.15s', minHeight: 36,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
          >
            🔍 <span>Search</span>
            <kbd style={{ fontSize: 9, background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 2 }}>⌘K</kbd>
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 3,
              cursor: canUndo ? 'pointer' : 'default',
              border: '1.5px solid var(--border2)',
              background: 'transparent',
              color: canUndo ? 'var(--text2)' : 'rgba(255,255,255,0.15)',
              transition: '0.15s',
              whiteSpace: 'nowrap',
              minHeight: 36,
              opacity: canUndo ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (canUndo) {
                e.currentTarget.style.borderColor = '#fff'
                e.currentTarget.style.color = '#fff'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = canUndo ? 'var(--text2)' : 'rgba(255,255,255,0.15)'
            }}
          >
            ↩ Undo
          </button>
          {user.fullAdmin && (
            <button
              onClick={() => router.push('/configure' as any)}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                padding: '6px 14px',
                borderRadius: 3,
                cursor: 'pointer',
                border: '1.5px solid var(--border2)',
                background: 'transparent',
                color: 'var(--text2)',
                transition: '0.15s',
                whiteSpace: 'nowrap',
                minHeight: 36,
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
              ⚙ Configure
            </button>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderLeft: `3px solid ${user.color}`,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
            }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
                {user.role}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{user.name}</div>
            </div>
            <div
              onClick={() => {
                if (confirm('Log out / switch user?')) {
                  import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }))
                }
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: user.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {user.name[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className="app-sidebar"
        style={{
          background: '#000',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Reorder toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            padding: '0 14px 8px',
          }}
        >
          <button
            onClick={() => setReordering(!reordering)}
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 3,
              cursor: 'pointer',
              border: `1px solid ${reordering ? 'var(--accent)' : 'var(--border2)'}`,
              background: reordering ? 'rgba(232,104,26,0.15)' : 'transparent',
              color: reordering ? 'var(--accent)' : 'var(--text3)',
              transition: '0.15s',
            }}
          >
            {reordering ? '✓ Done' : '↕ Reorder'}
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={accessItems.map((i) => i.key)}
            strategy={verticalListSortingStrategy}
          >
            {accessItems.map((item) => {
              const active = currentPath === item.key
              return (
                <SortableSidebarItem
                  key={item.key}
                  itemKey={item.key}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  reordering={reordering}
                  badge={item.key === 'notifications' ? unreadCount : undefined}
                  onClick={() => {
                    setCurrentPath(item.key)
                    router.push(`/${item.key}`)
                    if (item.key === 'notifications') setUnreadCount(0)
                  }}
                />
              )
            })}
          </SortableContext>
        </DndContext>

        {/* Test Lab — visible to all users, isolated from live data */}
        <div style={{
          margin: '16px 18px 4px',
          fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
          textTransform: 'uppercase', color: '#E8681A',
          borderTop: '1px solid rgba(232,104,26,0.3)',
          paddingTop: 12,
        }}>
          TEST ENV
        </div>
        {([
          { key: 'test', label: 'Test Lab', icon: '🧪', path: '/test' },
          { key: 'test/quotes', label: 'Test: Quoting', icon: '💲', path: '/test/quotes' },
          { key: 'test/engineering', label: 'Test: Engineering', icon: '📐', path: '/test/engineering' },
        ] as { key: string; label: string; icon: string; path: string }[]).map(item => {
          const active = currentPath === item.key || currentPath.startsWith(item.key + '/')
          return (
            <div
              key={item.key}
              onClick={() => { setCurrentPath(item.key); router.push(item.path as any) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 18px', cursor: 'pointer',
                borderLeft: `3px solid ${active ? '#E8681A' : 'transparent'}`,
                background: active ? 'rgba(232,104,26,0.08)' : 'transparent',
                fontSize: 13, fontWeight: 500,
                color: active ? '#E8681A' : 'rgba(232,104,26,0.6)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(232,104,26,0.05)'
                  e.currentTarget.style.color = '#E8681A'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(232,104,26,0.6)'
                }
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="app-main" style={{ overflowY: 'auto', background: 'var(--dark)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
