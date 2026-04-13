'use client'

import { useJobs } from '@/lib/hooks'
import { parseDate, fmtDate } from '@/lib/workdays'
import { STAGE_COLORS, STAGES } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'

const DAY_WIDTH = 28 // px per day
const ROW_HEIGHT = 48
const LABEL_WIDTH = 220

function getToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export default function TimelinePage() {
  const router = useRouter()
  const { data: jobs, mutate } = useJobs()
  const [stageFilter, setStageFilter] = useState('')
  const [dragging, setDragging] = useState<{ jobId: string; origDue: Date; startX: number } | null>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => getToday(), [])
  const windowStart = useMemo(() => addDays(today, -14), [today])
  const windowEnd = useMemo(() => addDays(today, 90), [today])
  const totalDays = daysBetween(windowStart, windowEnd)

  const filtered = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j: any) => j.stage !== 'Dispatch')
      .filter((j: any) => !stageFilter || j.stage === stageFilter)
      .sort((a: any, b: any) => {
        const da = parseDate(a.due) || addDays(today, 999)
        const db = parseDate(b.due) || addDays(today, 999)
        return da.getTime() - db.getTime()
      })
  }, [jobs, stageFilter, today])

  function getBarProps(job: any) {
    const due = parseDate(job.due)
    if (!due) return null
    const start = parseDate(job.startDate) || addDays(due, -21)
    const startOff = Math.max(0, daysBetween(windowStart, start))
    const endOff = Math.min(totalDays, daysBetween(windowStart, due))
    const width = Math.max(DAY_WIDTH, (endOff - startOff) * DAY_WIDTH)
    const left = startOff * DAY_WIDTH
    return { left, width, due, start }
  }

  // Month/week header
  const headerMonths = useMemo(() => {
    const months: { label: string; days: number }[] = []
    let cur = new Date(windowStart)
    while (cur < windowEnd) {
      const monthStart = new Date(cur)
      const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
      const end = nextMonth < windowEnd ? nextMonth : windowEnd
      months.push({
        label: cur.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
        days: daysBetween(cur, end),
      })
      cur = nextMonth
    }
    return months
  }, [windowStart, windowEnd])

  async function handleDragEnd(jobId: string, origDue: Date, deltaX: number) {
    const deltaDays = Math.round(deltaX / DAY_WIDTH)
    if (deltaDays === 0) return
    const newDue = addDays(origDue, deltaDays)
    const newDueStr = fmtDate(newDue)
    await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due: newDueStr }),
    })
    mutate()
  }

  const todayOffset = daysBetween(windowStart, today)

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>
            Timeline
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Production schedule — drag bars to reschedule
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setStageFilter('')}
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
              border: `1px solid ${!stageFilter ? '#E8681A' : 'var(--border)'}`,
              background: !stageFilter ? 'rgba(232,104,26,0.15)' : 'transparent',
              color: !stageFilter ? '#E8681A' : 'var(--text3)',
            }}
          >All</button>
          {STAGES.filter(s => s !== 'Dispatch').map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(stageFilter === s ? '' : s)}
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${stageFilter === s ? STAGE_COLORS[s] : 'var(--border)'}`,
                background: stageFilter === s ? `${STAGE_COLORS[s]}22` : 'transparent',
                color: stageFilter === s ? STAGE_COLORS[s] : 'var(--text3)',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Sticky header row */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--dark3)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, borderRight: '1px solid var(--border)', padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
            Job
          </div>
          <div style={{ flex: 1, overflowX: 'hidden' }}>
            <div style={{ display: 'flex', minWidth: totalDays * DAY_WIDTH }}>
              {headerMonths.map((m, i) => (
                <div
                  key={i}
                  style={{
                    width: m.days * DAY_WIDTH,
                    minWidth: m.days * DAY_WIDTH,
                    padding: '8px 10px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: 'var(--text3)',
                    borderRight: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div
          ref={containerRef}
          style={{ overflowX: 'auto' }}
          onMouseMove={(e) => {
            if (!dragging) return
            setDragDelta(e.clientX - dragging.startX)
          }}
          onMouseUp={(e) => {
            if (!dragging) return
            handleDragEnd(dragging.jobId, dragging.origDue, dragDelta)
            setDragging(null)
            setDragDelta(0)
          }}
          onMouseLeave={() => {
            if (dragging) {
              setDragging(null)
              setDragDelta(0)
            }
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No jobs in this stage</div>
          ) : filtered.map((job: any) => {
            const bar = getBarProps(job)
            const color = STAGE_COLORS[job.stage] || '#888'
            const isDraggingThis = dragging?.jobId === job.id
            let barLeft = bar?.left ?? 0
            if (isDraggingThis) barLeft += dragDelta

            return (
              <div key={job.id} style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', height: ROW_HEIGHT }}>
                {/* Label */}
                <div
                  onClick={() => router.push('/jobboard')}
                  style={{
                    width: LABEL_WIDTH, minWidth: LABEL_WIDTH,
                    borderRight: '1px solid var(--border)',
                    padding: '0 16px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{job.num}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.customer}
                  </div>
                </div>

                {/* Bar area */}
                <div style={{ position: 'relative', width: totalDays * DAY_WIDTH, minWidth: totalDays * DAY_WIDTH, height: ROW_HEIGHT }}>
                  {/* Today line */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: todayOffset * DAY_WIDTH,
                    width: 2,
                    background: 'rgba(232,104,26,0.5)',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }} />

                  {/* Row stripe */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                    background: isDraggingThis ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }} />

                  {/* Bar */}
                  {bar && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (!bar.due) return
                        setDragging({ jobId: job.id, origDue: bar.due, startX: e.clientX })
                        setDragDelta(0)
                      }}
                      style={{
                        position: 'absolute',
                        top: 8, bottom: 8,
                        left: barLeft,
                        width: bar.width,
                        background: `${color}cc`,
                        borderRadius: 4,
                        border: `1px solid ${color}`,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        display: 'flex', alignItems: 'center',
                        padding: '0 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        userSelect: 'none',
                        zIndex: 3,
                        boxShadow: isDraggingThis ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                        transition: isDraggingThis ? 'none' : 'box-shadow 0.15s',
                      }}
                    >
                      {bar.width > 60 && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.num} · {job.due}
                        </span>
                      )}
                    </div>
                  )}

                  {!bar && (
                    <div style={{
                      position: 'absolute', top: '50%', left: 20,
                      transform: 'translateY(-50%)',
                      fontSize: 10, color: 'var(--text3)', fontStyle: 'italic',
                    }}>
                      No due date
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {STAGES.filter(s => s !== 'Dispatch').map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: STAGE_COLORS[s] }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{s}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 1, background: 'rgba(232,104,26,0.5)' }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Today</span>
        </div>
      </div>
    </div>
  )
}
