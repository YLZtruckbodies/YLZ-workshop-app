'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  { key: 'floor', label: 'Workshop Floor', icon: '🔧', section: 'TOOLS' },
  { key: 'jobfollower', label: 'Job Follower', icon: '📝', section: 'TOOLS' },
  { key: 'qa', label: 'QA Checklist', icon: '✅', section: 'TOOLS' },
  { key: 'notifications', label: 'Notifications', icon: '🔔', section: 'TOOLS' },
  { key: 'timesheet', label: 'Time Logging', icon: '⏱', section: 'TOOLS' },
  { key: 'cashflow', label: 'Cashflow & Deliveries', icon: '💰', section: 'TOOLS' },
  { key: 'coldform', label: 'Coldform', icon: '🔩', section: 'TOOLS' },
  { key: 'reports', label: 'Reports', icon: '📋', section: 'TOOLS' },
  { key: 'quotes', label: 'Quotes', icon: '💲', section: 'TOOLS' },
  { key: 'sales', label: 'Sales', icon: '💼', section: 'TOOLS' },
  { key: 'engineering', label: 'Engineering', icon: '📐', section: 'TOOLS' },
  { key: 'repairs', label: 'Repairs / Warranty', icon: '🛠', section: 'TOOLS' },
]

function SortableSidebarItem({
  itemKey,
  label,
  icon,
  active,
  reordering,
  onClick,
}: {
  itemKey: string
  label: string
  icon: string
  active: boolean
  reordering: boolean
  onClick: () => void
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
      {label}
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UndoProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </UndoProvider>
  )
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const [currentPath, setCurrentPath] = useState('')
  const [reordering, setReordering] = useState(false)
  const [localAccess, setLocalAccess] = useState<string[] | null>(null)
  const { canUndo, undoLabel, pushUndo, undo, clearUndo } = useUndo()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    setCurrentPath(window.location.pathname.replace('/', ''))
  }, [])

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
      style={{
        display: 'grid',
        gridTemplateRows: '52px 1fr',
        gridTemplateColumns: '220px 1fr',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Top Bar */}
      <div
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
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 3, color: '#fff', lineHeight: 1 }}>
          YLZ
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)' }}>
          WORKSHOP
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border2)' }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3 }}>
          YLZ Truck Bodies — Production Management
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  onClick={() => {
                    setCurrentPath(item.key)
                    router.push(`/${item.key}`)
                  }}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Main Content */}
      <div style={{ overflowY: 'auto', background: 'var(--dark)', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
