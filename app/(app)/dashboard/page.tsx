'use client'

import { useSession } from 'next-auth/react'
import { useJobs } from '@/lib/hooks'
import { parseDate } from '@/lib/workdays'
import { STAGE_COLORS, STAGES } from '@/lib/constants'
import { useMemo, useEffect, useState } from 'react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data: jobs } = useJobs()
  const [activity, setActivity] = useState<any[]>([])
  const [revenueThisMonth, setRevenueThisMonth] = useState(0)

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const activeJobs = useMemo(() => jobs ? jobs.filter((j: any) => j.stage !== 'Dispatch') : [], [jobs])
  const fabCount = useMemo(() => jobs ? jobs.filter((j: any) => j.stage === 'Fab').length : 0, [jobs])
  const fitoutCount = useMemo(() => jobs ? jobs.filter((j: any) => j.stage === 'Fitout').length : 0, [jobs])
  const dispatchCount = useMemo(() => jobs ? jobs.filter((j: any) => j.stage === 'Dispatch').length : 0, [jobs])

  const lateJobs = useMemo(() => {
    if (!jobs) return []
    return jobs.filter((j: any) => {
      if (j.stage === 'Dispatch' || !j.due) return false
      const d = parseDate(j.due)
      return d && d < today
    })
  }, [jobs, today])

  const stageCounts = useMemo(() => {
    if (!jobs) return []
    const counts: Record<string, number> = {}
    for (const j of jobs) {
      if (j.stage !== 'Dispatch') counts[j.stage] = (counts[j.stage] || 0) + 1
    }
    return STAGES.filter(s => s !== 'Dispatch').map(s => ({ stage: s, count: counts[s] || 0 }))
  }, [jobs])

  const maxStageCount = useMemo(() => Math.max(...stageCounts.map(s => s.count), 1), [stageCounts])

  const deliveryJobs = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j: any) => j.due && j.due.trim() !== '')
      .sort((a: any, b: any) => {
        const da = parseDate(a.due)
        const db = parseDate(b.due)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.getTime() - db.getTime()
      })
      .slice(0, 10)
  }, [jobs])

  // Fetch recent activity and revenue
  useEffect(() => {
    // BUG-06: Show recent quote activity instead of empty job activity logs
    fetch('/api/quotes?limit=10')
      .then(r => r.json())
      .then((quotes: any[]) => {
        if (Array.isArray(quotes)) {
          const events = quotes.slice(0, 10).map((q: any) => ({
            id: q.id,
            type: 'quote',
            quoteNumber: q.quoteNumber,
            customerName: q.customerName,
            status: q.status,
            buildType: q.buildType,
            createdAt: q.updatedAt || q.createdAt,
          }))
          events.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setActivity(events)
        }
      })
      .catch(() => {})
    // Fetch revenue
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    fetch(`/api/quotes?status=accepted`)
      .then(r => r.json())
      .then((quotes: any[]) => {
        const start = new Date(monthStart)
        const total = quotes
          .filter((q: any) => {
            const d = q.acceptedAt ? new Date(q.acceptedAt) : (q.updatedAt ? new Date(q.updatedAt) : null)
            return d && d >= start
          })
          .reduce((sum: number, q: any) => sum + (q.overridePrice || q.total || 0), 0)
        setRevenueThisMonth(total)
      })
      .catch(() => {})
  }, [])

  if (!jobs) {
    return <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>Loading dashboard...</div>
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, lineHeight: 1 }}>
          DASHBOARD
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, letterSpacing: 0.3 }}>
          Production overview · YLZ Truck Bodies
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard label="Active Jobs" value={activeJobs.length} accentColor="var(--accent)" />
        <StatCard label="In Fabrication" value={fabCount} accentColor="var(--blue)" />
        <StatCard label="In Fitout" value={fitoutCount} accentColor="var(--amber)" />
        <StatCard label="Dispatched" value={dispatchCount} accentColor="var(--green)" />
        <StatCard label="Overdue" value={lateJobs.length} accentColor={lateJobs.length > 0 ? '#ef4444' : 'var(--text3)'} />
        <StatCard
          label="Revenue (MTD)"
          value={revenueThisMonth > 0 ? `$${(revenueThisMonth / 1000).toFixed(0)}k` : '$0'}
          accentColor="var(--green)"
          isString
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Pipeline Funnel */}
        <div>
          <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Production Pipeline
          </h2>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageCounts.map(s => {
              const color = STAGE_COLORS[s.stage] || '#888'
              const pct = (s.count / maxStageCount) * 100
              return (
                <div key={s.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{s.stage}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'League Spartan', sans-serif" }}>{s.count}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Recent Activity
          </h2>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {activity.length === 0 && (
              <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--text3)' }}>No recent activity</div>
            )}
            {activity.map((a: any) => {
              const statusColor: Record<string, string> = { draft: '#888', sent: '#3b82f6', accepted: '#22c55e', declined: '#ef4444', expired: '#eab308' }
              const sc = statusColor[a.status] || '#888'
              return (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      <span style={{ color: '#E8681A', fontWeight: 700 }}>{a.quoteNumber}</span>
                      {' · '}
                      <span>{a.customerName}</span>
                      {' · '}
                      <span style={{ color: sc, fontWeight: 600, textTransform: 'capitalize' }}>{a.status}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                      {a.buildType} · {new Date(a.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Overdue Jobs */}
      {lateJobs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#ef4444', margin: '0 0 12px 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ⚠ Overdue Jobs ({lateJobs.length})
          </h2>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, overflow: 'hidden' }}>
            {lateJobs.map((job: any) => (
              <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 90px', gap: 0, padding: '9px 16px', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{job.num}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{job.type}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{job.customer}</div>
                <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{job.due}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: `${STAGE_COLORS[job.stage] || '#888'}22`, color: STAGE_COLORS[job.stage] || '#888', border: `1px solid ${STAGE_COLORS[job.stage] || '#888'}44`, alignSelf: 'center', textAlign: 'center' }}>
                  {job.stage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Schedule */}
      <div>
        <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px 0', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Delivery Schedule
        </h2>
        {deliveryJobs.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 12, padding: '12px 0' }}>No jobs with due dates set.</div>
        ) : (
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 90px', gap: 0, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--dark3)' }}>
              {['Job No', 'Type', 'Customer', 'Due Date', 'Stage'].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)' }}>{h}</div>
              ))}
            </div>
            {deliveryJobs.map((job: any) => {
              const d = parseDate(job.due)
              const isLate = d && d < today && job.stage !== 'Dispatch'
              return (
                <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 100px 90px', gap: 0, padding: '9px 16px', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{job.num}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.type}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer}</div>
                  <div style={{ fontSize: 12, color: isLate ? '#ef4444' : '#fff', fontWeight: isLate ? 700 : 600 }}>{job.due}</div>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: `${STAGE_COLORS[job.stage] || 'var(--text3)'}22`, color: STAGE_COLORS[job.stage] || 'var(--text3)', border: `1px solid ${STAGE_COLORS[job.stage] || 'var(--text3)'}44` }}>
                      {job.stage}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accentColor, isString }: { label: string; value: number | string; accentColor: string; isString?: boolean }) {
  return (
    <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accentColor }} />
      <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: isString ? 24 : 38, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
        {label}
      </div>
    </div>
  )
}
