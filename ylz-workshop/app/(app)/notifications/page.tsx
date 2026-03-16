'use client'

import { useSession } from 'next-auth/react'
import { useJobs, useNotes, createNote } from '@/lib/hooks'
import { useMemo, useState } from 'react'

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  holdup: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', icon: '🚨', label: 'HOLD-UP' },
  update: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', icon: '💬', label: 'UPDATE' },
  resolved: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e', icon: '✅', label: 'RESOLVED' },
}

function timeAgo(date: string) {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const { data: allNotes, mutate: mutateNotes } = useNotes()
  const { data: activeHoldups, mutate: mutateActive } = useNotes({ active: 'true' })
  const { data: jobs } = useJobs()

  const [formJob, setFormJob] = useState('')
  const [formType, setFormType] = useState<'holdup' | 'update'>('holdup')
  const [formMessage, setFormMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Active jobs for dropdown
  const activeJobs = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j: any) => j.stage !== 'Dispatch')
      .sort((a: any, b: any) => a.num.localeCompare(b.num))
  }, [jobs])

  // Recent notes (last 50)
  const recentNotes = useMemo(() => {
    if (!allNotes) return []
    return allNotes.slice(0, 50)
  }, [allNotes])

  // Group recent notes by date
  const groupedNotes = useMemo(() => {
    const groups: Record<string, any[]> = {}
    recentNotes.forEach((n: any) => {
      const day = new Date(n.createdAt).toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      if (!groups[day]) groups[day] = []
      groups[day].push(n)
    })
    return groups
  }, [recentNotes])

  // Get job info helper
  const getJob = (jobId: string) => jobs?.find((j: any) => j.id === jobId)

  async function handleSubmit() {
    if (!formJob || !formMessage.trim()) return
    setSubmitting(true)
    try {
      await createNote({
        jobId: formJob,
        authorId: user?.id || 'unknown',
        authorName: user?.name || 'Unknown',
        type: formType,
        message: formMessage.trim(),
      })
      setFormMessage('')
      setFormJob('')
      mutateNotes()
      mutateActive()
    } catch (e) {
      alert('Failed to post note')
    }
    setSubmitting(false)
  }

  async function handleResolve(holdup: any) {
    const job = getJob(holdup.jobId)
    const jobLabel = job ? job.num : holdup.jobId
    try {
      await createNote({
        jobId: holdup.jobId,
        authorId: user?.id || 'unknown',
        authorName: user?.name || 'Unknown',
        type: 'resolved',
        message: `Resolved: ${holdup.message}`,
      })
      mutateNotes()
      mutateActive()
    } catch (e) {
      alert('Failed to resolve')
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <h1
        style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#fff',
          margin: '0 0 6px',
        }}
      >
        Notifications & Hold-ups
      </h1>
      <p style={{ color: 'var(--text3)', fontSize: 13, margin: '0 0 28px' }}>
        Flag issues, post updates, and track hold-ups on jobs
      </p>

      {/* Active Hold-ups */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 18 }}>🚨</span>
          <h2
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: '#ef4444',
              margin: 0,
            }}
          >
            Active Hold-ups
          </h2>
          {activeHoldups && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: activeHoldups.length > 0 ? '#ef4444' : '#22c55e',
                color: '#fff',
                borderRadius: 10,
                padding: '2px 8px',
                minWidth: 20,
                textAlign: 'center',
              }}
            >
              {activeHoldups.length}
            </span>
          )}
        </div>

        {!activeHoldups || activeHoldups.length === 0 ? (
          <div
            style={{
              padding: '24px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8,
              color: '#22c55e',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            ✅ No active hold-ups — all clear!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeHoldups.map((h: any) => {
              const job = getJob(h.jobId)
              return (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 18px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#fff',
                        }}
                      >
                        {job?.num || h.jobId}
                      </span>
                      {job && (
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {job.type} — {job.customer || 'No customer'}
                        </span>
                      )}
                      {job && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 3,
                            background: 'rgba(255,255,255,0.1)',
                            color: 'var(--text2)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {job.stage}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
                      {h.message}
                    </p>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Posted by <strong style={{ color: 'var(--text2)' }}>{h.authorName}</strong> · {timeAgo(h.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(h)}
                    style={{
                      fontFamily: "'League Spartan', sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: '1px solid #22c55e',
                      background: 'transparent',
                      color: '#22c55e',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: '0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#22c55e'
                      e.currentTarget.style.color = '#fff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#22c55e'
                    }}
                  >
                    Resolve
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Post an Update */}
      <section
        style={{
          marginBottom: 32,
          padding: '20px 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        <h2
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--text2)',
            margin: '0 0 16px',
          }}
        >
          Post an Update
        </h2>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {/* Job selector */}
          <select
            value={formJob}
            onChange={(e) => setFormJob(e.target.value)}
            style={{
              flex: '1 1 220px',
              padding: '10px 12px',
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: '#fff',
              fontSize: 13,
              fontFamily: "'League Spartan', sans-serif",
            }}
          >
            <option value="">Select a job...</option>
            {activeJobs.map((j: any) => (
              <option key={j.id} value={j.id}>
                {j.num} — {j.type} ({j.customer || 'No customer'})
              </option>
            ))}
          </select>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setFormType('holdup')}
              style={{
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'League Spartan', sans-serif",
                letterSpacing: 0.5,
                border: 'none',
                cursor: 'pointer',
                background: formType === 'holdup' ? '#ef4444' : 'var(--dark2)',
                color: formType === 'holdup' ? '#fff' : 'var(--text3)',
                transition: '0.15s',
              }}
            >
              🚨 Hold-up
            </button>
            <button
              onClick={() => setFormType('update')}
              style={{
                padding: '10px 16px',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'League Spartan', sans-serif",
                letterSpacing: 0.5,
                border: 'none',
                borderLeft: '1px solid var(--border)',
                cursor: 'pointer',
                background: formType === 'update' ? '#3b82f6' : 'var(--dark2)',
                color: formType === 'update' ? '#fff' : 'var(--text3)',
                transition: '0.15s',
              }}
            >
              💬 Update
            </button>
          </div>
        </div>

        {/* Message */}
        <textarea
          value={formMessage}
          onChange={(e) => setFormMessage(e.target.value)}
          placeholder={
            formType === 'holdup'
              ? 'Describe the issue... e.g. Waiting on parts from supplier, ETA next week'
              : 'Post an update... e.g. Paint coat applied, drying overnight'
          }
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--dark2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            color: '#fff',
            fontSize: 13,
            fontFamily: "'League Spartan', sans-serif",
            resize: 'vertical',
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!formJob || !formMessage.trim() || submitting}
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            padding: '10px 24px',
            borderRadius: 4,
            border: 'none',
            background:
              !formJob || !formMessage.trim() || submitting
                ? 'rgba(255,255,255,0.1)'
                : formType === 'holdup'
                  ? '#ef4444'
                  : '#3b82f6',
            color: !formJob || !formMessage.trim() || submitting ? 'var(--text3)' : '#fff',
            cursor: !formJob || !formMessage.trim() || submitting ? 'not-allowed' : 'pointer',
            transition: '0.15s',
          }}
        >
          {submitting ? 'Posting...' : formType === 'holdup' ? 'Flag Hold-up' : 'Post Update'}
        </button>
      </section>

      {/* Recent Activity Feed */}
      <section>
        <h2
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'var(--text2)',
            margin: '0 0 16px',
          }}
        >
          Recent Activity
        </h2>

        {Object.keys(groupedNotes).length === 0 ? (
          <div
            style={{
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text3)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            No activity yet. Post the first update above!
          </div>
        ) : (
          Object.entries(groupedNotes).map(([day, notes]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: 'var(--text3)',
                  marginBottom: 8,
                  paddingBottom: 6,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(notes as any[]).map((n: any) => {
                  const style = TYPE_STYLES[n.type] || TYPE_STYLES.update
                  const job = getJob(n.jobId)
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '10px 14px',
                        background: style.bg,
                        borderLeft: `3px solid ${style.border}`,
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{style.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                              color: style.border,
                            }}
                          >
                            {style.label}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                            {job?.num || n.jobId}
                          </span>
                          {job && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {job.type}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '0 0 3px', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {n.authorName} · {formatDate(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
