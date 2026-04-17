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
