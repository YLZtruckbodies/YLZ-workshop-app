'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { mutate as globalMutate } from 'swr'
import { useWorkers, useTimesheets, useJobs, useRepairJobs, exportTimesheets } from '@/lib/hooks'

interface BlockState {
  job: string
  start: string
  end: string
}

const DEFAULT_BLOCKS: { key: string; label: string; start: string; end: string }[] = [
  { key: 'morning', label: 'MORNING', start: '07:00', end: '10:00' },
  { key: 'midday', label: 'MIDDAY', start: '10:00', end: '13:00' },
  { key: 'afternoon', label: 'AFTERNOON', start: '13:00', end: '15:30' },
  { key: 'overtime', label: 'OVERTIME', start: '15:30', end: '18:00' },
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

export default function TimesheetPage() {
  const { data: session } = useSession()
  const { data: workers } = useWorkers()
  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`

  const [selectedWorker, setSelectedWorker] = useState('')
  const [date, setDate] = useState(todayStr)
  const [blocks, setBlocks] = useState<Record<string, BlockState>>(emptyBlocks)
  const [dayStatus, setDayStatus] = useState<DayStatus>('working')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const { data: timesheets, mutate } = useTimesheets(date)
  const { data: jobs } = useJobs()
  const { data: repairJobs } = useRepairJobs()

  // Build sorted job options from DB + special codes + repair jobs
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

  // Pre-fill existing entries when worker or date changes
  useEffect(() => {
    if (!selectedWorker || !timesheets) {
      setBlocks(emptyBlocks())
      setDayStatus('working')
      return
    }
    const workerEntries = (timesheets as any[]).filter((t) => t.workerName === selectedWorker)

    // Check for leave/sick
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

  function totalHours(): number {
    return DEFAULT_BLOCKS.reduce((sum, b) => {
      const block = blocks[b.key]
      if (!block.job.trim()) return sum
      return sum + calcHours(block.start, block.end)
    }, 0)
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

  // Group all timesheets by workshop section
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
        // section field now stores the block key (morning/midday/afternoon/overtime)
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
        <button onClick={handleExport} style={exportBtnStyle}>
          Export CSV
        </button>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Worker + date + status row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, maxWidth: 280, minWidth: 200 }}>
            <label style={labelStyle}>Worker</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              style={inputStyle}
            >
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

          {/* Status toggles */}
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

            {/* Column headers */}
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
                            <td
                              colSpan={4}
                              style={{
                                padding: '10px 16px',
                                textAlign: 'center',
                              }}
                            >
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
