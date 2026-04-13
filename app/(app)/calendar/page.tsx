'use client'

import { useJobs, useDeliveries } from '@/lib/hooks'
import { parseDate } from '@/lib/workdays'
import { STAGE_COLORS } from '@/lib/constants'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const router = useRouter()
  const { data: jobs } = useJobs()
  const { data: deliveries } = useDeliveries()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [view, setView] = useState<'month' | 'week'>('month')

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Build a map: dateStr → jobs[]
  const jobsByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    if (!jobs) return map
    for (const j of jobs) {
      if (!j.due) continue
      const d = parseDate(j.due)
      if (!d) continue
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate()
        if (!map[key]) map[key] = []
        map[key].push(j)
      }
    }
    return map
  }, [jobs, year, month])

  const deliveriesByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    if (!deliveries) return map
    for (const d of deliveries) {
      if (!d.deliveryDate) continue
      const dt = parseDate(d.deliveryDate)
      if (!dt) continue
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const key = dt.getDate()
        if (!map[key]) map[key] = []
        map[key].push(d)
      }
    }
    return map
  }, [deliveries, year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const selectedJobs = selectedDay ? (jobsByDate[selectedDay] || []) : []
  const selectedDeliveries = selectedDay ? (deliveriesByDate[selectedDay] || []) : []
  const isToday = (day: number) => now.getFullYear() === year && now.getMonth() === month && now.getDate() === day

  // Build calendar grid cells (null = empty, number = day)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif", height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>Calendar</h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Job due dates and deliveries</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={navBtn}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtn}>›</button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
            style={{ ...navBtn, fontSize: 11, padding: '6px 14px', letterSpacing: 0.5 }}
          >Today</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Calendar Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', padding: '6px 0' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const hasJobs = (jobsByDate[day] || []).length > 0
              const hasDeliveries = (deliveriesByDate[day] || []).length > 0
              const todayCell = isToday(day)
              const selected = selectedDay === day
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(selected ? null : day)}
                  style={{
                    background: selected ? 'rgba(232,104,26,0.15)' : todayCell ? 'rgba(255,255,255,0.06)' : 'var(--dark2)',
                    border: `1px solid ${selected ? '#E8681A' : todayCell ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
                    borderRadius: 6,
                    padding: '8px 6px',
                    cursor: 'pointer',
                    minHeight: 72,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ fontSize: todayCell ? 14 : 12, fontWeight: todayCell ? 800 : 500, color: todayCell ? '#E8681A' : '#fff' }}>
                    {day}
                  </div>
                  {(jobsByDate[day] || []).slice(0, 3).map((j: any) => (
                    <div
                      key={j.id}
                      style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                        background: `${STAGE_COLORS[j.stage] || '#888'}33`,
                        color: STAGE_COLORS[j.stage] || '#888',
                        borderRadius: 3,
                        padding: '1px 4px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {j.num}
                    </div>
                  ))}
                  {(jobsByDate[day] || []).length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>+{(jobsByDate[day]).length - 3} more</div>
                  )}
                  {hasDeliveries && (
                    <div style={{ fontSize: 9, color: '#22d07a', fontWeight: 600 }}>
                      📦 {(deliveriesByDate[day] || []).length} delivery
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        {selectedDay && (
          <div style={{ width: 280, background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
              {selectedDay} {MONTH_NAMES[month]} {year}
            </div>

            {selectedJobs.length === 0 && selectedDeliveries.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nothing scheduled</div>
            )}

            {selectedJobs.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                  Jobs Due
                </div>
                {selectedJobs.map((j: any) => (
                  <div
                    key={j.id}
                    onClick={() => router.push('/jobboard')}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${STAGE_COLORS[j.stage] || 'var(--border)'}44`,
                      borderLeft: `3px solid ${STAGE_COLORS[j.stage] || '#888'}`,
                      borderRadius: 6,
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{j.num}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{j.customer}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{j.type}</div>
                    <div style={{ marginTop: 6, display: 'inline-block', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: `${STAGE_COLORS[j.stage] || '#888'}22`, color: STAGE_COLORS[j.stage] || '#888' }}>
                      {j.stage}
                    </div>
                  </div>
                ))}
              </>
            )}

            {selectedDeliveries.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8, marginTop: 12 }}>
                  Deliveries
                </div>
                {selectedDeliveries.map((d: any) => (
                  <div key={d.id} style={{ padding: '10px 12px', background: 'rgba(34,208,122,0.08)', border: '1px solid rgba(34,208,122,0.2)', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#22d07a' }}>{d.jobNum}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{d.customer}</div>
                    {d.invoiceAmount > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        ${d.invoiceAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'var(--dark2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  width: 36,
  height: 36,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}
