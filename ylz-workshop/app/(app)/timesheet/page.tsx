'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { mutate as globalMutate } from 'swr'
import useSWR from 'swr'
import { useWorkers, useTimesheets, useJobs, useRepairJobs, exportTimesheets } from '@/lib/hooks'

interface BlockState {
  job: string
  start: string
  end: string
}

// Standard day: 07:00–15:15 with 30-min unpaid break = 7.6 ordinary hours
// Early OT: 06:00–07:00 | Late OT: 15:15–16:15 (both modifiable)
const DEFAULT_BLOCKS: { key: string; label: string; start: string; end: string }[] = [
  { key: 'early_ot',  label: 'EARLY OT',  start: '06:00', end: '07:00' },
  { key: 'morning',   label: 'MORNING',   start: '07:00', end: '09:30' },
  { key: 'midday',    label: 'MIDDAY',    start: '09:30', end: '12:30' },
  { key: 'afternoon', label: 'AFTERNOON', start: '13:00', end: '15:15' },
  { key: 'overtime',  label: 'LATE OT',   start: '15:15', end: '16:15' },
]

const SECTION_LABELS: Record<string, string> = {
  alloy: 'Alloy Fabrication',
  hardox: 'Hardox / Steel Fab',
  chassis: 'Chassis',
  fitout: 'Fitout',
  trailerfit: 'Trailer Fitout',
  subfit: 'Subframe Fitout',
  paint: 'Paint',
}

const SECTION_COLORS: Record<string, string> = {
  alloy: '#3b9de8',
  hardox: '#e2e2e2',
  chassis: '#22d07a',
  fitout: '#8aaec6',
  trailerfit: '#a78bfa',
  subfit: '#e2e2e2',
  paint: '#f5a623',
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type DayStatus = 'working' | 'leave' | 'sick'

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60
  return Math.max(0, Math.round(diff * 100) / 100)
}

function emptyBlocks(): Record<string, BlockState> {
  const b: Record<string, BlockState> = {}
  DEFAULT_BLOCKS.forEach((d) => {
    b[d.key] = { job: '', start: d.start, end: d.end }
  })
  return b
}

function getWeekDates(offset: number): string[] {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`
  })
}

function parseDate(ddmmyy: string): Date {
  const [dd, mm, yy] = ddmmyy.split('/').map(Number)
  return new Date(2000 + yy, mm - 1, dd)
}

function formatWeekRange(weekDates: string[]): string {
  const first = parseDate(weekDates[0])
  const last = parseDate(weekDates[6])
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`
  }
  return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${last.getFullYear()}`
}

function isTodayDate(ddmmyy: string): boolean {
  const today = new Date()
  const t = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`
  return ddmmyy === t
}

const swrFetcher = (url: string) => fetch(url).then((r) => r.json())

export default function TimesheetPage() {
  const { data: session } = useSession()
  const { data: workers } = useWorkers()

  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`

  const [view, setView] = useState<'log' | 'week'>('log')
  const [weekOffset, setWeekOffset] = useState(0)

  const [selectedWorker, setSelectedWorker] = useState('')
  const [date, setDate] = useState(todayStr)
  const [blocks, setBlocks] = useState<Record<string, BlockState>>(emptyBlocks)
  const [dayStatus, setDayStatus] = useState<DayStatus>('working')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const { data: timesheets, mutate } = useTimesheets(date)
  const { data: jobs } = useJobs()
  const { data: repairJobs } = useRepairJobs()

  // Weekly view data
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const { data: weekTimesheets, isLoading: weekLoading } = useSWR<any[]>(
    view === 'week' ? `/api/timesheets?dates=${weekDates.join(',')}` : null,
    swrFetcher,
    { refreshInterval: 30000 }
  )

  const jobOptions = useMemo(() => {
    const special = [
      { value: 'NON-PRODUCTIVE', label: 'NON PRODUCTIVE' },
      { value: 'STOCK-PARTS', label: 'STOCK PARTS' },
    ]
    const dbJobs = (jobs || [])
      .map((j: any) => ({ value: j.num, label: `${j.num}${j.customer ? ' — ' + j.customer : ''}` }))
      .sort((a: any, b: any) => a.value.localeCompare(b.value))
    const repairOptions = (repairJobs || [])
      .filter((r: any) => r.status !== 'Complete')
      .map((r: any) => ({ value: r.num, label: `${r.num} — ${r.type}: ${r.description}` }))
      .sort((a: any, b: any) => a.value.localeCompare(b.value))
    return { special, dbJobs, repairOptions }
  }, [jobs, repairJobs])

  const workerInfo = useMemo(() => {
    if (!selectedWorker || !workers) return null
    return workers.find((w: any) => w.name === selectedWorker)
  }, [selectedWorker, workers])

  useEffect(() => {
    if (!selectedWorker || !timesheets) {
      setBlocks(emptyBlocks())
      setDayStatus('working')
      return
    }
    const workerEntries = (timesheets as any[]).filter((t) => t.workerName === selectedWorker)
    const statusEntry = workerEntries.find((t) => t.startTime === 'LEAVE' || t.startTime === 'SICK')
    if (statusEntry) {
      setDayStatus(statusEntry.startTime.toLowerCase() as DayStatus)
      setBlocks(emptyBlocks())
      return
    }
    setDayStatus('working')
    const filled = emptyBlocks()
    for (const entry of workerEntries) {
      const block = DEFAULT_BLOCKS.find((b) => b.key === entry.section)
      if (block) {
        filled[block.key] = { job: entry.jobNum, start: entry.startTime, end: entry.endTime }
      }
    }
    setBlocks(filled)
  }, [selectedWorker, timesheets])

  function updateBlock(key: string, field: keyof BlockState, value: string) {
    setBlocks((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  const OT_KEYS = ['overtime', 'early_ot']

  function totalHours(): number {
    const ordRaw = DEFAULT_BLOCKS.filter((b) => !OT_KEYS.includes(b.key)).reduce((sum, b) => {
      const block = blocks[b.key]
      if (!block.job.trim()) return sum
      return sum + calcHours(block.start, block.end)
    }, 0)
    const otHrs = DEFAULT_BLOCKS.filter((b) => OT_KEYS.includes(b.key)).reduce((sum, b) => {
      const block = blocks[b.key]
      if (!block.job.trim()) return sum
      return sum + calcHours(block.start, block.end)
    }, 0)
    const breakDed = ordRaw >= 5 ? 0.15 : 0
    const ordinary = Math.min(Math.max(0, ordRaw - breakDed), 7.6)
    return Math.round((ordinary + otHrs) * 100) / 100
  }

  async function handleSave() {
    if (!selectedWorker) {
      setMessage('Select a worker first')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    const entries: any[] = []
    if (dayStatus === 'leave' || dayStatus === 'sick') {
      entries.push({
        workerName: selectedWorker,
        jobNum: dayStatus.toUpperCase(),
        section: dayStatus,
        date,
        startTime: dayStatus.toUpperCase(),
        endTime: '',
        hours: 0,
        createdBy: session?.user?.id || '',
      })
    } else {
      for (const b of DEFAULT_BLOCKS) {
        const block = blocks[b.key]
        if (!block.job.trim()) continue
        entries.push({
          workerName: selectedWorker,
          jobNum: block.job.trim().toUpperCase().replace(/\s+/g, ''),
          section: b.key,
          date,
          startTime: block.start,
          endTime: block.end,
          hours: calcHours(block.start, block.end),
          createdBy: session?.user?.id || '',
        })
      }
    }
    if (entries.length === 0) {
      setMessage('Enter at least one job number')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      if (!res.ok) throw new Error('Failed')
      setMessage('Day saved')
      mutate()
      globalMutate('/api/stats')
    } catch {
      setMessage('Failed to save')
    }
    setSubmitting(false)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleExport() {
    try {
      const blob = await exportTimesheets(date)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${date.replace(/\//g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('CSV exported')
    } catch {
      setMessage('Export failed')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleWeeklyXeroExport() {
    try {
      const ts = weekTimesheets || []
      // weekDates is Mon[0]..Sun[6]; Xero uses Mon-Sat (indices 0-5), week ending = Sunday [6]
      const monToSat = weekDates.slice(0, 6)
      const weekEndDate = parseDate(weekDates[6])
      const fmtXeroDate = (d: Date) =>
        `${d.getDate().toString().padStart(2, '0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`
      const weekEndStr = fmtXeroDate(weekEndDate)
      const periodStart = fmtXeroDate(parseDate(weekDates[0]))
      const periodEnd = fmtXeroDate(weekEndDate)

      // Build per-worker per-day hours (ordinary + OT split, with break deduction)
      const workerOrder: string[] = []
      const workerDayOrd: Record<string, number[]> = {}  // ordinary hours Mon-Sat
      const workerDayOT: Record<string, number[]> = {}   // OT hours Mon-Sat
      const workerDayOrdRaw: Record<string, number[]> = {} // raw ordinary (for break calc)
      for (const t of ts as any[]) {
        if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
        if (!workerDayOrd[t.workerName]) {
          workerDayOrd[t.workerName] = [0, 0, 0, 0, 0, 0]
          workerDayOT[t.workerName] = [0, 0, 0, 0, 0, 0]
          workerDayOrdRaw[t.workerName] = [0, 0, 0, 0, 0, 0]
          workerOrder.push(t.workerName)
        }
        const dayIdx = monToSat.indexOf(t.date)
        if (dayIdx < 0) continue
        if (['overtime','early_ot'].includes(t.section)) {
          workerDayOT[t.workerName][dayIdx] += t.hours || 0
        } else {
          workerDayOrdRaw[t.workerName][dayIdx] += t.hours || 0
        }
      }
      // Apply break deduction and cap
      for (const name of workerOrder) {
        for (let i = 0; i < 6; i++) {
          const raw = workerDayOrdRaw[name][i]
          const breakDed = raw >= 5 ? 0.15 : 0
          workerDayOrd[name][i] = Math.min(Math.max(0, raw - breakDed), ORDINARY_CAP)
        }
      }

      const fmt2 = (n: number) => n.toFixed(2)
      const rows: string[] = [
        'Timesheet Details',
        'YLZ Truck Bodies Pty Ltd',
        `For the period ${periodStart} to ${periodEnd}`,
        '',
        'Week Ending,Employee,Mon,Tue,Wed,Thu,Fri,Sat,Total',
      ]

      for (const name of workerOrder) {
        const ordDays = workerDayOrd[name]
        const otDays  = workerDayOT[name]
        const ordTotal = ordDays.reduce((a, b) => a + b, 0)
        const otTotal  = otDays.reduce((a, b) => a + b, 0)
        const empName = name.toUpperCase()
        rows.push(`${weekEndStr},${empName},${ordDays.map(fmt2).join(',')},${fmt2(ordTotal)}`)
        if (otTotal > 0) {
          rows.push(`${weekEndStr},${empName},${otDays.map(fmt2).join(',')},${fmt2(otTotal)}`)
        }
      }

      rows.push('')
      rows.push(',6AM-4.30PM,7AM-5PM,7AM-4.30PM,7AM-4PM,7AM-3.15PM,7AM-11PM,')
      rows.push('')
      rows.push('NORMAL HOURS - 7.00AM TO 3.15PM - HALF HOUR LUNCH IS 7.6 HOUR DAY')
      rows.push('ANY HOURS BEFORE 7.00AM AND AFTER 3.15PM IS OVERTIME')

      const csv = rows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `xero-timesheet-${weekEndStr.replace(/ /g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMessage('Xero export downloaded')
    } catch {
      setMessage('Export failed')
    }
    setTimeout(() => setMessage(''), 3000)
  }

  const grouped = useMemo(() => {
    if (!timesheets || !workers) return {}
    const groups: Record<string, { workerName: string; color: string; periods: Record<string, { job: string; hours: number }>; status?: string }[]> = {}
    const workerMap: Record<string, { section: string; color: string }> = {}
    for (const w of workers) {
      workerMap[w.name] = { section: w.section || 'other', color: w.color || '#787878' }
    }
    const workerData: Record<string, { periods: Record<string, { job: string; hours: number }>; status?: string }> = {}
    for (const t of timesheets as any[]) {
      if (!workerData[t.workerName]) workerData[t.workerName] = { periods: {} }
      if (t.startTime === 'LEAVE' || t.startTime === 'SICK') {
        workerData[t.workerName].status = t.startTime
      } else {
        const blockKey = t.section
        if (DEFAULT_BLOCKS.find((b) => b.key === blockKey)) {
          workerData[t.workerName].periods[blockKey] = { job: t.jobNum, hours: t.hours || 0 }
        }
      }
    }
    for (const [name, data] of Object.entries(workerData)) {
      const info = workerMap[name] || { section: 'other', color: '#787878' }
      if (!groups[info.section]) groups[info.section] = []
      groups[info.section].push({ workerName: name, color: info.color, ...data })
    }
    return groups
  }, [timesheets, workers])

  const ORDINARY_CAP = 7.6 // standard day hours (38hr week / 5 days)

  // Weekly grid data
  const weeklyGrouped = useMemo(() => {
    if (!workers) return []
    const ts = weekTimesheets || []
    const sectionOrder = ['hardox', 'alloy', 'chassis', 'paint', 'fitout', 'trailerfit', 'subfit', 'other']
    const sections: Record<string, { workerName: string; color: string; section: string; days: { totalHours: number; normalHrs: number; otHrs: number; status: string | null }[]; weekNormal: number; weekOT: number }[]> = {}

    for (const w of workers as any[]) {
      const sec = w.section || 'other'
      if (!sections[sec]) sections[sec] = []
      const days = weekDates.map((d) => {
        const entries = ts.filter((t: any) => t.workerName === w.name && t.date === d)
        const statusEntry = entries.find((t: any) => t.startTime === 'LEAVE' || t.startTime === 'SICK')
        if (statusEntry) return { totalHours: 0, normalHrs: 0, otHrs: 0, status: statusEntry.startTime as string }
        const ordRaw = entries.filter((t: any) => !['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
        const otBlockHrs = entries.filter((t: any) => ['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
        // Apply 30-min break deduction for any day >= 5h ordinary raw (standard full/part day)
        const breakDeduction = ordRaw >= 5 ? 0.15 : 0
        const normalHrs = Math.min(Math.max(0, ordRaw - breakDeduction), ORDINARY_CAP)
        const otHrs = otBlockHrs // excess ordinary is absorbed, not added to OT
        const totalHours = normalHrs + otHrs
        return { totalHours, normalHrs, otHrs, status: null }
      })
      const weekNormal = days.reduce((sum, d) => sum + d.normalHrs, 0)
      const weekOT = days.reduce((sum, d) => sum + d.otHrs, 0)
      sections[sec].push({ workerName: w.name, color: w.color || '#787878', section: sec, days, weekNormal, weekOT })
    }

    return sectionOrder.filter((s) => sections[s] && sections[s].length > 0).map((s) => ({
      section: s,
      workers: sections[s],
    }))
  }, [workers, weekTimesheets, weekDates])

  // Day totals for the weekly view footer (ordinary + OT, with break deduction)
  const weekDayTotals = useMemo(() => {
    const ts = weekTimesheets || []
    return weekDates.map((d) => {
      const entries = (ts as any[]).filter((t) => t.date === d && t.startTime !== 'LEAVE' && t.startTime !== 'SICK')
      const ordRaw = entries.filter((t: any) => !['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
      const otHrs  = entries.filter((t: any) => ['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
      const breakDed = ordRaw >= 5 ? 0.15 : 0
      const ordinary = Math.min(Math.max(0, ordRaw - breakDed), ORDINARY_CAP)
      return { ordinary, ot: otHrs }
    })
  }, [weekTimesheets, weekDates])

  const sectionOrder = ['hardox', 'alloy', 'chassis', 'paint', 'fitout', 'trailerfit', 'subfit', 'other']

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
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
            TIME LOGGING
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Allocate job numbers per section of the day
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--dark3)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, gap: 2 }}>
            {([
              { key: 'log', label: 'Log Time' },
              { key: 'week', label: 'Weekly Hours' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  padding: '7px 16px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: 'none',
                  background: view === tab.key ? '#E8681A' : 'transparent',
                  color: view === tab.key ? '#fff' : 'var(--text3)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {view === 'log' && (
            <button onClick={handleExport} style={exportBtnStyle}>
              Export CSV
            </button>
          )}
          {view === 'week' && (
            <button onClick={handleWeeklyXeroExport} style={exportBtnStyle}>
              Export Week (Xero)
            </button>
          )}
        </div>
      </div>

      {/* LOG TIME VIEW */}
      {view === 'log' && (
        <div style={{ padding: '24px 28px' }}>
          {/* Worker + date + status row */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, maxWidth: 280, minWidth: 200 }}>
              <label style={labelStyle}>Worker</label>
              <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} style={inputStyle}>
                <option value="">Select your name...</option>
                {workers?.map((w: any) => (
                  <option key={w.id} value={w.name}>
                    {w.name} — {w.role}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: 140 }}>
              <label style={labelStyle}>Date</label>
              <input
                type="text"
                placeholder="dd/mm/yy"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            {selectedWorker && (
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([
                    { key: 'working', label: 'Working', color: 'var(--green)' },
                    { key: 'leave', label: 'Leave', color: 'var(--blue)' },
                    { key: 'sick', label: 'Sick', color: 'var(--red)' },
                  ] as const).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setDayStatus(s.key)}
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        borderRadius: 3,
                        cursor: 'pointer',
                        border: dayStatus === s.key ? `1.5px solid ${s.color}` : '1.5px solid var(--border2)',
                        background: dayStatus === s.key ? `${s.color}15` : 'var(--dark3)',
                        color: dayStatus === s.key ? s.color : 'var(--text3)',
                        minHeight: 44,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {workerInfo && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--dark3)',
                  border: '1px solid var(--border2)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 44,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: SECTION_COLORS[workerInfo.section] || '#787878',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                  {SECTION_LABELS[workerInfo.section] || workerInfo.section}
                </span>
              </div>
            )}
          </div>

          {/* Day blocks or leave/sick message */}
          {dayStatus !== 'working' ? (
            <div
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '30px 20px',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: dayStatus === 'leave' ? 'var(--blue)' : 'var(--red)',
                  marginBottom: 8,
                }}
              >
                {dayStatus === 'leave' ? 'ON LEAVE' : 'SICK DAY'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {selectedWorker} marked as {dayStatus} for {date}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    color: 'var(--text)',
                  }}
                >
                  YOUR DAY
                </div>
                {selectedWorker && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)' }}>
                    Total: <span style={{ color: '#fff' }}>{totalHours()}h</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 110px 110px 60px 1fr',
                  gap: 12,
                  padding: '0 16px 8px',
                }}
              >
                <span style={colHeaderStyle}>&nbsp;</span>
                <span style={colHeaderStyle}>Start</span>
                <span style={colHeaderStyle}>Finish</span>
                <span style={colHeaderStyle}>Hours</span>
                <span style={colHeaderStyle}>Job Number</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEFAULT_BLOCKS.map((b) => {
                  const block = blocks[b.key]
                  const hrs = block.job.trim() ? calcHours(block.start, block.end) : 0
                  const isOT = b.key === 'overtime'
                  return (
                    <div
                      key={b.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 110px 110px 60px 1fr',
                        alignItems: 'center',
                        gap: 12,
                        padding: '8px 16px',
                        background: 'var(--dark3)',
                        border: '1px solid var(--border)',
                        borderLeft: isOT ? '3px solid #f5a623' : '1px solid var(--border)',
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          color: isOT ? '#f5a623' : '#fff',
                        }}
                      >
                        {b.label}
                      </div>
                      <input
                        type="time"
                        value={block.start}
                        onChange={(e) => updateBlock(b.key, 'start', e.target.value)}
                        disabled={!selectedWorker}
                        style={{ ...timeInputStyle, opacity: selectedWorker ? 1 : 0.4 }}
                      />
                      <input
                        type="time"
                        value={block.end}
                        onChange={(e) => updateBlock(b.key, 'end', e.target.value)}
                        disabled={!selectedWorker}
                        style={{ ...timeInputStyle, opacity: selectedWorker ? 1 : 0.4 }}
                      />
                      <div
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: hrs > 0 ? (isOT ? '#f5a623' : '#fff') : 'var(--text3)',
                          textAlign: 'center',
                        }}
                      >
                        {hrs > 0 ? `${hrs}h` : '—'}
                      </div>
                      <select
                        value={block.job}
                        onChange={(e) => updateBlock(b.key, 'job', e.target.value)}
                        disabled={!selectedWorker}
                        style={{
                          ...inputStyle,
                          fontFamily: "'League Spartan', sans-serif",
                          fontWeight: 700,
                          fontSize: 14,
                          letterSpacing: 1,
                          color: block.job ? '#fff' : 'var(--text3)',
                          opacity: selectedWorker ? 1 : 0.4,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23888' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 10px center',
                          paddingRight: 30,
                        }}
                      >
                        <option value="">Select job...</option>
                        <optgroup label="Special Codes">
                          {jobOptions.special.map((o: any) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </optgroup>
                        {jobOptions.repairOptions.length > 0 && (
                          <optgroup label="Repairs / Warranty">
                            {jobOptions.repairOptions.map((o: any) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Jobs">
                          {jobOptions.dbJobs.map((o: any) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Save button */}
          {selectedWorker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <button
                onClick={handleSave}
                disabled={submitting}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '10px 28px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'var(--btn-primary)',
                  color: '#f7f7f7',
                }}
              >
                {submitting ? 'Saving...' : 'Save Day'}
              </button>
              {message && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: message.includes('Failed') || message.includes('required') || message.includes('Select') || message.includes('Enter')
                      ? 'var(--red)'
                      : 'var(--green)',
                  }}
                >
                  {message}
                </span>
              )}
            </div>
          )}

          {/* Today's entries grouped by section */}
          <div
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 1.5,
              marginBottom: 14,
            }}
          >
            TODAY&apos;S ENTRIES
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 40,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text3)',
              }}
            >
              No entries for this date yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sectionOrder
                .filter((sec) => grouped[sec])
                .map((sec) => (
                  <div
                    key={sec}
                    style={{
                      background: 'var(--dark2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--dark3)',
                      }}
                    >
                      <div style={{ width: 4, height: 20, borderRadius: 2, background: SECTION_COLORS[sec] || '#787878' }} />
                      <span
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                          color: '#fff',
                        }}
                      >
                        {SECTION_LABELS[sec] || sec}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                        {grouped[sec].length} worker{grouped[sec].length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Worker</th>
                          <th style={thStyle}>Morning</th>
                          <th style={thStyle}>Midday</th>
                          <th style={thStyle}>Afternoon</th>
                          <th style={thStyle}>Overtime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[sec].map((w) => (
                          <tr key={w.workerName} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: w.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#fff',
                                    flexShrink: 0,
                                  }}
                                >
                                  {w.workerName.charAt(0)}
                                </div>
                                {w.workerName}
                              </div>
                            </td>
                            {w.status ? (
                              <td colSpan={4} style={{ padding: '10px 16px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                    padding: '3px 10px',
                                    borderRadius: 3,
                                    color: w.status === 'LEAVE' ? 'var(--blue)' : 'var(--red)',
                                    background: w.status === 'LEAVE' ? 'rgba(59,157,232,0.1)' : 'rgba(232,69,96,0.1)',
                                  }}
                                >
                                  {w.status}
                                </span>
                              </td>
                            ) : (
                              <>
                                {['morning', 'midday', 'afternoon'].map((pk) => (
                                  <td key={pk} style={{ padding: '10px 16px' }}>
                                    {w.periods[pk] ? (
                                      <div>
                                        <span
                                          style={{
                                            fontFamily: "'League Spartan', sans-serif",
                                            fontSize: 13,
                                            fontWeight: 700,
                                            letterSpacing: 1,
                                            color: '#fff',
                                          }}
                                        >
                                          {w.periods[pk].job}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                                          {w.periods[pk].hours}h
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</span>
                                    )}
                                  </td>
                                ))}
                                <td style={{ padding: '10px 16px' }}>
                                  {w.periods.overtime ? (
                                    <div>
                                      <span
                                        style={{
                                          fontFamily: "'League Spartan', sans-serif",
                                          fontSize: 13,
                                          fontWeight: 700,
                                          letterSpacing: 1,
                                          color: '#f5a623',
                                        }}
                                      >
                                        {w.periods.overtime.job}
                                      </span>
                                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                                        {w.periods.overtime.hours}h
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</span>
                                  )}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* WEEKLY HOURS VIEW */}
      {view === 'week' && (
        <div style={{ padding: '24px 28px' }}>
          {/* Week navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              style={weekNavBtnStyle}
            >
              ← Prev
            </button>
            <div
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1,
                color: '#fff',
                minWidth: 200,
                textAlign: 'center',
              }}
            >
              {formatWeekRange(weekDates)}
            </div>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              style={weekNavBtnStyle}
            >
              Next →
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{
                  ...weekNavBtnStyle,
                  borderColor: '#E8681A',
                  color: '#E8681A',
                  marginLeft: 4,
                }}
              >
                This Week
              </button>
            )}
          </div>

          {weekLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 13 }}>
              Loading week data...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {weeklyGrouped.length === 0 ? (
                <div
                  style={{
                    background: 'var(--dark2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 48,
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--text3)',
                  }}
                >
                  No workers found. Add workers to get started.
                </div>
              ) : (
                weeklyGrouped.map(({ section, workers: sectionWorkers }) => (
                  <div
                    key={section}
                    style={{
                      background: 'var(--dark2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Section header */}
                    <div
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--dark3)',
                      }}
                    >
                      <div style={{ width: 4, height: 20, borderRadius: 2, background: SECTION_COLORS[section] || '#787878' }} />
                      <span
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: 1.5,
                          textTransform: 'uppercase',
                          color: '#fff',
                        }}
                      >
                        {SECTION_LABELS[section] || section}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                        {sectionWorkers.length} worker{sectionWorkers.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Grid table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                          <tr style={{ background: 'var(--dark3)' }}>
                            <th style={{ ...thStyle, width: 180, textAlign: 'left' }}>Worker</th>
                            {weekDates.map((d, i) => {
                              const isToday = isTodayDate(d)
                              const dayNum = d.split('/')[0]
                              return (
                                <th
                                  key={d}
                                  style={{
                                    ...thStyle,
                                    textAlign: 'center',
                                    color: isToday ? '#E8681A' : i >= 5 ? 'rgba(255,255,255,0.25)' : 'var(--text3)',
                                    borderBottom: isToday ? '2px solid #E8681A' : '1px solid var(--border2)',
                                  }}
                                >
                                  <div>{DAY_NAMES[i]}</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: isToday ? '#E8681A' : i >= 5 ? 'rgba(255,255,255,0.2)' : '#fff', marginTop: 1 }}>
                                    {parseInt(dayNum)}
                                  </div>
                                </th>
                              )
                            })}
                              <th style={{ ...thStyle, textAlign: 'center', color: 'var(--text2)', minWidth: 80 }}>Ordinary</th>
                            <th style={{ ...thStyle, textAlign: 'center', color: '#f5a623', minWidth: 60 }}>OT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionWorkers.map((w) => (
                            <tr
                              key={w.workerName}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div
                                    style={{
                                      width: 26,
                                      height: 26,
                                      borderRadius: '50%',
                                      background: w.color,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: '#fff',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {w.workerName.charAt(0)}
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 600 }}>{w.workerName}</span>
                                </div>
                              </td>
                              {w.days.map((day, i) => {
                                const isToday = isTodayDate(weekDates[i])
                                const isWeekend = i >= 5
                                const isStatus = day.status === 'LEAVE' || day.status === 'SICK'
                                let cellBg = 'transparent'
                                if (day.status === 'LEAVE') cellBg = 'rgba(59,130,246,0.08)'
                                else if (day.status === 'SICK') cellBg = 'rgba(239,68,68,0.08)'
                                else if (day.totalHours >= ORDINARY_CAP) cellBg = 'rgba(34,197,94,0.06)'
                                else if (day.totalHours > 0) cellBg = 'rgba(234,179,8,0.06)'

                                return (
                                  <td
                                    key={i}
                                    onClick={() => { setDate(weekDates[i]); setSelectedWorker(w.workerName); setView('log') }}
                                    style={{
                                      padding: '6px 4px',
                                      textAlign: 'center',
                                      cursor: 'pointer',
                                      background: isToday ? (cellBg === 'transparent' ? 'rgba(232,104,26,0.04)' : cellBg) : cellBg,
                                      borderLeft: isToday ? '1px solid rgba(232,104,26,0.2)' : '1px solid transparent',
                                      borderRight: isToday ? '1px solid rgba(232,104,26,0.2)' : '1px solid transparent',
                                      opacity: isWeekend && !day.status && day.totalHours === 0 ? 0.35 : 1,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.opacity = isWeekend && !day.status && day.totalHours === 0 ? '0.35' : '1' }}
                                  >
                                    {isStatus ? (
                                      <span style={{
                                        display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                                        padding: '2px 7px', borderRadius: 3,
                                        color: day.status === 'LEAVE' ? 'rgba(59,130,246,0.85)' : 'rgba(239,68,68,0.85)',
                                        background: day.status === 'LEAVE' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)',
                                        border: `1px solid ${day.status === 'LEAVE' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                      }}>
                                        {day.status}
                                      </span>
                                    ) : day.totalHours > 0 ? (
                                      <div>
                                        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: 'rgba(34,197,94,0.9)' }}>
                                          {Math.round(day.normalHrs * 10) / 10}h
                                        </div>
                                        {day.otHrs > 0 && (
                                          <div style={{ fontSize: 10, fontWeight: 700, color: '#f5a623', marginTop: 1 }}>
                                            +{Math.round(day.otHrs * 10) / 10} OT
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                                    )}
                                  </td>
                                )
                              })}
                              <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800, color: w.weekNormal >= 35 ? 'rgba(34,197,94,0.9)' : w.weekNormal > 0 ? '#fff' : 'var(--text3)' }}>
                                  {w.weekNormal > 0 ? `${Math.round(w.weekNormal * 10) / 10}h` : '—'}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: w.weekOT > 0 ? '#f5a623' : 'var(--text3)' }}>
                                  {w.weekOT > 0 ? `${Math.round(w.weekOT * 10) / 10}h` : '—'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {/* Day totals footer */}
                        <tfoot>
                          <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--dark3)' }}>
                            <td
                              style={{
                                padding: '8px 16px',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 0.8,
                                textTransform: 'uppercase',
                                color: 'var(--text3)',
                              }}
                            >
                              Section Total
                            </td>
                            {weekDates.map((d, i) => {
                              const entries = (weekTimesheets || []).filter(
                                (t: any) => t.date === d && t.startTime !== 'LEAVE' && t.startTime !== 'SICK' &&
                                  sectionWorkers.some((w) => w.workerName === t.workerName)
                              )
                              const ordRaw = entries.filter((t: any) => !['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
                              const otHrs  = entries.filter((t: any) => ['overtime','early_ot'].includes(t.section)).reduce((s: number, t: any) => s + (t.hours || 0), 0)
                              const breakDed = ordRaw >= 5 ? 0.15 : 0
                              const secOrd = Math.min(Math.max(0, ordRaw - breakDed), ORDINARY_CAP * sectionWorkers.filter(w => entries.some(t => t.workerName === w.workerName)).length)
                              const secTotal = secOrd + otHrs
                              return (
                                <td
                                  key={i}
                                  style={{
                                    padding: '8px 6px',
                                    textAlign: 'center',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    fontFamily: "'League Spartan', sans-serif",
                                    color: secTotal > 0 ? 'var(--text2)' : 'rgba(255,255,255,0.15)',
                                  }}
                                >
                                  {secTotal > 0 ? `${Math.round(secTotal * 10) / 10}h` : '—'}
                                </td>
                              )
                            })}
                            <td
                              style={{
                                padding: '8px 12px',
                                textAlign: 'center',
                                borderLeft: '1px solid var(--border)',
                                fontSize: 12,
                                fontWeight: 800,
                                fontFamily: "'League Spartan', sans-serif",
                                color: 'var(--text2)',
                              }}
                            >
                              {(() => {
                                const t = sectionWorkers.reduce((sum, w) => sum + w.weekNormal, 0)
                                return t > 0 ? `${Math.round(t * 10) / 10}h` : '—'
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))
              )}

              {/* Week grand total footer */}
              {weeklyGrouped.length > 0 && (
                <div
                  style={{
                    background: 'var(--dark2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                      <tbody>
                        <tr>
                          <td
                            style={{
                              padding: '12px 16px',
                              width: 180,
                              fontFamily: "'League Spartan', sans-serif",
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: 1,
                              textTransform: 'uppercase',
                              color: 'var(--text3)',
                            }}
                          >
                            All Workers
                          </td>
                          {weekDates.map((d, i) => {
                            const { ordinary, ot } = weekDayTotals[i]
                            const dayTotal = ordinary + ot
                            const isToday = isTodayDate(d)
                            return (
                              <td key={i} style={{ padding: '8px 4px', textAlign: 'center', background: isToday ? 'rgba(232,104,26,0.06)' : 'transparent' }}>
                                {dayTotal > 0 ? (
                                  <div>
                                    <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800, color: 'rgba(34,197,94,0.9)' }}>
                                      {Math.round(ordinary * 10) / 10}h
                                    </div>
                                    {ot > 0 && (
                                      <div style={{ fontSize: 10, fontWeight: 700, color: '#f5a623', marginTop: 1 }}>
                                        +{Math.round(ot * 10) / 10} OT
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>—</span>
                                )}
                              </td>
                            )
                          })}
                          <td style={{ padding: '10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                            <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, color: 'rgba(34,197,94,0.9)' }}>
                              {(() => {
                                const t = weekDayTotals.reduce((a, b) => a + b.ordinary, 0)
                                return t > 0 ? `${Math.round(t * 10) / 10}h` : '—'
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                            <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, color: '#f5a623' }}>
                              {(() => {
                                const t = weekDayTotals.reduce((a, b) => a + b.ot, 0)
                                return t > 0 ? `${Math.round(t * 10) / 10}h` : '—'
                              })()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 4 }}>
                {[
                  { color: 'rgba(34,197,94,0.9)', bg: 'rgba(34,197,94,0.08)', label: 'Ordinary (≤7.6h)' },
                  { color: '#f5a623', bg: 'rgba(245,166,35,0.08)', label: 'Overtime (>7.6h)' },
                  { color: 'rgba(234,179,8,0.85)', bg: 'rgba(234,179,8,0.08)', label: 'Partial day' },
                  { color: 'rgba(59,130,246,0.85)', bg: 'rgba(59,130,246,0.12)', label: 'Leave' },
                  { color: 'rgba(239,68,68,0.85)', bg: 'rgba(239,68,68,0.12)', label: 'Sick' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: item.bg,
                        border: `1px solid ${item.color}`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#f5a623', fontWeight: 700 }}>OT</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Includes overtime</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                  Click any cell to open that day in Log Time
                </div>
              </div>
            </div>
          )}
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

const timeInputStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: 'var(--dark4)',
  border: '1px solid var(--border2)',
  borderRadius: 4,
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  minHeight: 38,
  width: '100%',
}

const colHeaderStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: 'var(--text3)',
}

const thStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: 'var(--text3)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border2)',
}

const exportBtnStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  padding: '8px 16px',
  borderRadius: 3,
  cursor: 'pointer',
  border: '1.5px solid rgba(255,255,255,0.12)',
  background: 'var(--btn-primary)',
  color: '#f7f7f7',
  minHeight: 40,
}

const weekNavBtnStyle: React.CSSProperties = {
  fontFamily: "'League Spartan', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  padding: '8px 16px',
  borderRadius: 4,
  cursor: 'pointer',
  border: '1.5px solid var(--border)',
  background: 'transparent',
  color: 'var(--text3)',
  minHeight: 36,
  transition: 'all 0.15s',
}
