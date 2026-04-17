'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SECTION_LABELS: Record<string, string> = {
  alloy: 'Alloy Fab',
  hardox: 'Hardox/Steel',
  chassis: 'Chassis',
  fitout: 'Fitout',
  trailerfit: 'Trailer Fit',
  subfit: 'Subframe Fit',
  paint: 'Paint',
  other: 'Other',
}

const SECTION_COLORS: Record<string, string> = {
  alloy: '#3b9de8',
  hardox: '#c8c8c8',
  chassis: '#22d07a',
  fitout: '#8aaec6',
  trailerfit: '#a78bfa',
  subfit: '#d4d4d4',
  paint: '#f5a623',
  other: '#787878',
}

const STAGE_COLORS: Record<string, string> = {
  'Requires Engineering': '#f97316',
  'Ready to Start': '#06b6d4',
  Fab: '#e84560',
  Paint: '#f5a623',
  Fitout: '#3b9de8',
  QC: '#a78bfa',
  Dispatch: '#22d07a',
}

const STAGE_ORDER = ['Requires Engineering', 'Ready to Start', 'Fab', 'Paint', 'Fitout', 'QC', 'Dispatch']

function stagePercent(stage: string): number {
  const map: Record<string, number> = { 'Requires Engineering': 5, 'Ready to Start': 10, Fab: 25, Paint: 45, Fitout: 65, QC: 80, Dispatch: 100 }
  return map[stage] || 0
}

export default function AnalyticsPage() {
  const { data: stats, isLoading } = useSWR('/api/stats', fetcher, { refreshInterval: 30000 })

  const topJobs = useMemo(() => {
    if (!stats?.jobHours) return []
    return stats.jobHours.filter((j: any) => j.hours > 0).slice(0, 15)
  }, [stats])

  const sectionPieData = useMemo(() => {
    if (!stats?.sectionHours) return []
    return stats.sectionHours.map((s: any) => ({
      name: SECTION_LABELS[s.section] || s.section,
      value: Math.round(s.hours * 10) / 10,
      color: SECTION_COLORS[s.section] || '#787878',
    }))
  }, [stats])

  const stagePieData = useMemo(() => {
    if (!stats?.stageCount) return []
    return STAGE_ORDER.filter((s) => stats.stageCount[s]).map((s) => ({
      name: s,
      value: stats.stageCount[s],
      color: STAGE_COLORS[s],
    }))
  }, [stats])

  const activeJobs = useMemo(() => {
    if (!stats?.jobHours) return []
    return stats.jobHours
      .filter((j: any) => j.prodGroup === 'issued' || j.prodGroup === 'goahead')
      .sort((a: any, b: any) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))
  }, [stats])

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
        Loading analytics...
      </div>
    )
  }

  if (!stats) return null

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
        }}
      >
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
          PRODUCTION ANALYTICS
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          Hours tracking, job progress & workshop overview
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard label="Total Hours Logged" value={`${stats.totalHours}h`} color="#fff" />
          <StatCard label="Active Jobs" value={stats.activeJobsCount} color="var(--blue)" />
          <StatCard label="Near Complete (QC/Dispatch)" value={stats.nearCompleteCount} color="var(--green)" />
          <StatCard label="Workers Logged Today" value={stats.workersToday} color="var(--accent)" sub={
            (stats.onLeave.length > 0 || stats.onSick.length > 0)
              ? `${stats.onLeave.length} leave, ${stats.onSick.length} sick`
              : undefined
          } />
        </div>

        {/* Charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Hours per Job */}
          <ChartCard title="HOURS PER JOB" subtitle="Top jobs by total hours logged">
            {topJobs.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topJobs} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <XAxis type="number" tick={{ fill: '#787878', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="jobNum" tick={{ fill: '#c8c8c8', fontSize: 11, fontWeight: 600 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                    formatter={(value: any) => [`${value}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" fill="#3b9de8" radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>

          {/* Hours by Section */}
          <ChartCard title="HOURS BY SECTION" subtitle="Workshop section breakdown">
            {sectionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    dataKey="value"
                    stroke="none"
                    label={({ name, value }) => `${name}: ${value}h`}
                  >
                    {sectionPieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, fontSize: 12 }}
                    formatter={(value: any) => [`${value}h`, 'Hours']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Hours per Worker */}
          <ChartCard title="HOURS PER WORKER" subtitle="Total hours logged by each worker">
            {stats.workerHours.filter((w: any) => w.hours > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.workerHours.filter((w: any) => w.hours > 0)} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#c8c8c8', fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#787878', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, fontSize: 12 }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                    formatter={(value: any) => [`${value}h`, 'Hours']}
                  />
                  <Bar dataKey="hours" radius={[3, 3, 0, 0]} barSize={20}>
                    {stats.workerHours.filter((w: any) => w.hours > 0).map((w: any, i: number) => (
                      <Cell key={i} fill={SECTION_COLORS[w.section] || '#787878'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>

          {/* Stage Distribution */}
          <ChartCard title="JOB STAGES" subtitle="Active jobs by current stage">
            {stagePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    dataKey="value"
                    stroke="none"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stagePieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value: string) => <span style={{ color: '#c8c8c8', fontSize: 11 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <NoData />
            )}
          </ChartCard>
        </div>

        {/* Daily hours trend */}
        {stats.dailyHours.length > 0 && (
          <ChartCard title="DAILY HOURS" subtitle="Total workshop hours per day" style={{ marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.dailyHours} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fill: '#787878', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#787878', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 4, fontSize: 12 }}
                  labelStyle={{ color: '#fff', fontWeight: 700 }}
                  formatter={(value: any) => [`${value}h`, 'Hours']}
                />
                <Area type="monotone" dataKey="hours" stroke="#3b9de8" fill="rgba(59,157,232,0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Hours Per Job — Section Breakdown */}
        {stats.jobSectionBreakdown && (
          <JobSectionBreakdown
            jobHours={stats.jobHours}
            breakdown={stats.jobSectionBreakdown}
          />
        )}

        {/* Worker Comparison */}
        {stats.workerJobHours && stats.workerWeeklyHours && (
          <WorkerComparison
            workerJobHours={stats.workerJobHours}
            workerWeeklyHours={stats.workerWeeklyHours}
            workerHours={stats.workerHours}
          />
        )}

        {/* Active Jobs Progress */}
        <div
          style={{
            background: 'var(--dark2)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--dark3)' }}>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: '#fff' }}>
              ACTIVE JOBS — PROGRESS & HOURS
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {activeJobs.length} active jobs across all stages
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Job #', 'Type', 'Customer', 'Stage', 'Progress', 'Hours'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color: 'var(--text3)',
                      textAlign: 'left',
                      borderBottom: '1px solid var(--border2)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeJobs.map((job: any) => {
                const pct = stagePercent(job.stage)
                return (
                  <tr key={job.jobNum} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#fff' }}>
                        {job.jobNum}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text2)' }}>{job.type}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)' }}>{job.customer || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 3,
                          color: STAGE_COLORS[job.stage] || '#787878',
                          background: `${STAGE_COLORS[job.stage] || '#787878'}18`,
                        }}
                      >
                        {job.stage}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', width: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: STAGE_COLORS[job.stage] || '#787878',
                              borderRadius: 3,
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, minWidth: 30 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          fontFamily: "'League Spartan', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: job.hours > 0 ? '#fff' : 'var(--text3)',
                        }}
                      >
                        {job.hours > 0 ? `${job.hours}h` : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '16px 20px',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, children, style: extraStyle }: { title: string; subtitle: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: 20,
        ...extraStyle,
      }}
    >
      <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: '#fff', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>{subtitle}</div>
      {children}
    </div>
  )
}

function NoData() {
  return (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
      No data yet — log some timesheet entries first
    </div>
  )
}

const WS_LABELS: Record<string, string> = {
  hardox: 'Hardox/Steel',
  alloy: 'Alloy Fab',
  chassis: 'Chassis',
  fitout: 'Fitout',
  trailerfit: 'Trailer Fit',
  subfit: 'Subframe Fit',
  paint: 'Paint',
  electrical: 'Electrical',
  other: 'Other',
  '': 'Unassigned',
}

const WS_COLORS: Record<string, string> = {
  hardox: '#c8c8c8',
  alloy: '#3b9de8',
  chassis: '#22d07a',
  fitout: '#8aaec6',
  trailerfit: '#a78bfa',
  subfit: '#d4d4d4',
  paint: '#f5a623',
  electrical: '#f97316',
  other: '#787878',
  '': '#555',
}

function WorkerComparison({
  workerJobHours,
  workerWeeklyHours,
  workerHours,
}: {
  workerJobHours: Record<string, Record<string, number>>
  workerWeeklyHours: Record<string, Record<string, { total: number; ot: number; days: number }>>
  workerHours: any[]
}) {
  const allWorkers = workerHours.filter((w: any) => w.hours > 0).map((w: any) => w.name).sort()
  const [workerA, setWorkerA] = useState('Rav')
  const [workerB, setWorkerB] = useState('JD')

  const aJobs = workerJobHours[workerA] || {}
  const bJobs = workerJobHours[workerB] || {}
  const allJobs = [...new Set([...Object.keys(aJobs), ...Object.keys(bJobs)])].sort()
  const sharedJobs = allJobs.filter(j => (aJobs[j] || 0) > 0 && (bJobs[j] || 0) > 0)

  const aWeeks = workerWeeklyHours[workerA] || {}
  const bWeeks = workerWeeklyHours[workerB] || {}
  const allWeeks = [...new Set([...Object.keys(aWeeks), ...Object.keys(bWeeks)])].sort((a, b) => {
    const [ad, am, ay] = a.split('/')
    const [bd, bm, by] = b.split('/')
    return new Date(2000 + parseInt(ay), parseInt(am) - 1, parseInt(ad)).getTime() - new Date(2000 + parseInt(by), parseInt(bm) - 1, parseInt(bd)).getTime()
  })

  const aTotalH = Object.values(aJobs).reduce((s, h) => s + h, 0)
  const bTotalH = Object.values(bJobs).reduce((s, h) => s + h, 0)
  const aAvgWeek = allWeeks.length > 0 ? Object.values(aWeeks).reduce((s, w) => s + w.total, 0) / Object.keys(aWeeks).length : 0
  const bAvgWeek = allWeeks.length > 0 ? Object.values(bWeeks).reduce((s, w) => s + w.total, 0) / Object.keys(bWeeks).length : 0
  const aOT = Object.values(aWeeks).reduce((s, w) => s + w.ot, 0)
  const bOT = Object.values(bWeeks).reduce((s, w) => s + w.ot, 0)

  const selectStyle: React.CSSProperties = {
    background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
    padding: '8px 12px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'League Spartan', sans-serif", letterSpacing: 1,
  }

  return (
    <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--dark3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: '#fff' }}>
            WORKER COMPARISON
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Side-by-side hours breakdown
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={workerA} onChange={(e) => setWorkerA(e.target.value)} style={selectStyle}>
            {allWorkers.map((w: string) => <option key={w} value={w}>{w}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>vs</span>
          <select value={workerB} onChange={(e) => setWorkerB(e.target.value)} style={selectStyle}>
            {allWorkers.map((w: string) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Total Hours</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#3b82f6' }}>{Math.round(aTotalH)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerA}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{Math.round(bTotalH)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerB}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Avg Hours / Week</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#3b82f6' }}>{aAvgWeek.toFixed(1)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerA}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{bAvgWeek.toFixed(1)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerB}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Overtime Hours</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#3b82f6' }}>{Math.round(aOT)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerA}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{Math.round(bOT)}h</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{workerB}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      <div style={{ padding: '14px 20px 6px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
        Weekly Breakdown
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Week of', `${workerA} Hours`, `${workerA} OT`, `${workerA} Days`, `${workerB} Hours`, `${workerB} OT`, `${workerB} Days`, 'Difference'].map((h) => (
              <th key={h} style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border2)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allWeeks.map((wk) => {
            const a = aWeeks[wk] || { total: 0, ot: 0, days: 0 }
            const b = bWeeks[wk] || { total: 0, ot: 0, days: 0 }
            const diff = a.total - b.total
            return (
              <tr key={wk} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600 }}>{wk}</td>
                <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{a.total}h</td>
                <td style={{ padding: '8px 16px', fontSize: 11, color: a.ot > 0 ? '#f5a623' : 'var(--text3)' }}>{a.ot > 0 ? `${a.ot}h` : '—'}</td>
                <td style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text3)' }}>{a.days > 0 ? `${a.days}d` : '—'}</td>
                <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{b.total}h</td>
                <td style={{ padding: '8px 16px', fontSize: 11, color: b.ot > 0 ? '#f5a623' : 'var(--text3)' }}>{b.ot > 0 ? `${b.ot}h` : '—'}</td>
                <td style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text3)' }}>{b.days > 0 ? `${b.days}d` : '—'}</td>
                <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: diff > 0 ? '#3b82f6' : diff < 0 ? '#22c55e' : 'var(--text3)' }}>
                  {diff > 0 ? `+${diff.toFixed(1)}h` : diff < 0 ? `${diff.toFixed(1)}h` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Shared jobs comparison */}
      {sharedJobs.length > 0 && (
        <>
          <div style={{ padding: '14px 20px 6px', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
            Shared Jobs ({sharedJobs.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Job #', `${workerA}`, `${workerB}`, 'Total', 'Split'].map((h) => (
                  <th key={h} style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border2)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sharedJobs.sort((a, b) => ((aJobs[b] || 0) + (bJobs[b] || 0)) - ((aJobs[a] || 0) + (bJobs[a] || 0))).map((job) => {
                const ah = Math.round((aJobs[job] || 0) * 10) / 10
                const bh = Math.round((bJobs[job] || 0) * 10) / 10
                const total = ah + bh
                const aPct = total > 0 ? (ah / total) * 100 : 0
                const bPct = total > 0 ? (bh / total) * 100 : 0
                return (
                  <tr key={job} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{job}</span>
                    </td>
                    <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{ah}h</td>
                    <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{bh}h</td>
                    <td style={{ padding: '8px 16px', fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff' }}>{total}h</td>
                    <td style={{ padding: '8px 16px', width: '30%' }}>
                      <div style={{ display: 'flex', height: 16, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${aPct}%`, background: '#3b82f6', minWidth: 2 }} />
                        <div style={{ width: `${bPct}%`, background: '#22c55e', minWidth: 2 }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function JobSectionBreakdown({ jobHours, breakdown }: { jobHours: any[]; breakdown: Record<string, Record<string, { hours: number; workers: Record<string, number> }>> }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const jobsWithBreakdown = jobHours.filter((j: any) => breakdown[j.jobNum] && j.hours > 0).slice(0, 25)

  if (jobsWithBreakdown.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 14,
      }}
    >
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--dark3)' }}>
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: '#fff' }}>
          HOURS PER JOB — SECTION BREAKDOWN
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          Click a job to see hours by section and worker
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Job #', 'Type', 'Customer', 'Total Hours', 'Sections'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 16px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'var(--text3)',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border2)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobsWithBreakdown.map((job: any) => {
            const sections = breakdown[job.jobNum] || {}
            const sectionKeys = Object.keys(sections).sort((a, b) => sections[b].hours - sections[a].hours)
            const isExpanded = expanded === job.jobNum
            const maxHours = Math.max(...Object.values(sections).map((s: any) => s.hours), 1)

            return (
              <React.Fragment key={job.jobNum}>
                <tr
                  onClick={() => setExpanded(isExpanded ? null : job.jobNum)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#E8681A' }}>
                      {isExpanded ? '▾' : '▸'} {job.jobNum}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text2)' }}>{job.type || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text3)' }}>{job.customer || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {Math.round(job.hours * 10) / 10}h
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', height: 14, borderRadius: 3, overflow: 'hidden', maxWidth: 200 }}>
                      {sectionKeys.map((ws) => {
                        const pct = (sections[ws].hours / job.hours) * 100
                        return (
                          <div
                            key={ws}
                            style={{
                              width: `${pct}%`,
                              background: WS_COLORS[ws] || '#787878',
                              minWidth: pct > 0 ? 2 : 0,
                            }}
                            title={`${WS_LABELS[ws] || ws}: ${Math.round(sections[ws].hours * 10) / 10}h`}
                          />
                        )
                      })}
                    </div>
                  </td>
                </tr>

                {isExpanded && sectionKeys.map((ws) => {
                  const sec = sections[ws]
                  const workerEntries = Object.entries(sec.workers).sort((a: any, b: any) => b[1] - a[1])
                  const barWidth = (sec.hours / maxHours) * 100

                  return (
                    <tr key={`${job.jobNum}-${ws}`} style={{ background: 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '6px 16px 6px 40px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 3,
                          color: WS_COLORS[ws] || '#787878',
                          background: `${WS_COLORS[ws] || '#787878'}18`,
                        }}>
                          {WS_LABELS[ws] || ws}
                        </span>
                      </td>
                      <td colSpan={2} style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text3)' }}>
                        {workerEntries.map(([name, hrs]) => (
                          <span key={name} style={{ marginRight: 12 }}>
                            {name} <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{Math.round((hrs as number) * 10) / 10}h</span>
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '6px 16px' }}>
                        <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: WS_COLORS[ws] || '#787878' }}>
                          {Math.round(sec.hours * 10) / 10}h
                        </span>
                      </td>
                      <td style={{ padding: '6px 16px' }}>
                        <div style={{ height: 10, borderRadius: 2, overflow: 'hidden', maxWidth: 200, background: 'rgba(255,255,255,0.04)' }}>
                          <div style={{ width: `${barWidth}%`, height: '100%', background: WS_COLORS[ws] || '#787878', borderRadius: 2 }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
