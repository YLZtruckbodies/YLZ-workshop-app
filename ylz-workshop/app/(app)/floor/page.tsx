'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useJobs, useWorkers, advanceJob, createJob } from '@/lib/hooks'
import { STAGES, nextStage, stageIndex } from '@/lib/jobTypes'

/* ── Section definitions ── */
const SECTIONS = [
  { key: 'hardox-fab', name: 'Hardox / Steel Fab', color: '#e2e2e2', team: 'Rav, JD', stage: 'Fab', typeFilter: 'hardox', userSection: 'Steel' },
  { key: 'alloy-fab', name: 'Alloy Fabrication', color: '#3b9de8', team: 'Darwin, Julio, Ben', stage: 'Fab', typeFilter: 'ally', userSection: 'Alloy' },
  { key: 'chassis', name: 'Truck Chassis / Subframes', color: '#22d07a', team: 'Herson, Rob, Andres, Dennis, Kabaj, Mohit', stage: 'Fab', typeFilter: null, userSection: null },
  { key: 'trailer-chassis', name: 'Trailer Chassis', color: '#a78bfa', team: 'Kabaj, Mohit', stage: 'Fab', typeFilter: 'trailer', userSection: null },
  { key: 'paint', name: 'Paint', color: '#f5a623', team: 'Tony, Emma', stage: 'Paint', typeFilter: null, userSection: null },
  { key: 'fitout-bodies', name: 'Fitout Bodies', color: '#8aaec6', team: 'Bailey, Dan', stage: 'Fitout', typeFilter: 'body', userSection: null },
  { key: 'fitout-trailer', name: 'Fitout Trailer Chassis', color: '#a78bfa', team: 'Mark, Arvi', stage: 'Fitout', typeFilter: 'trailer', userSection: null },
  { key: 'fitout-sub', name: 'Fitout Subframes', color: '#e2e2e2', team: 'Nathan', stage: 'Fitout', typeFilter: null, userSection: null },
  { key: 'qc', name: 'QC', color: '#9b6dff', team: 'Matt', stage: 'QC', typeFilter: null, userSection: 'QC' },
]

/* ── Stage-specific checklists ── */
const STAGE_CHECKS: Record<string, string[]> = {
  Fab: ['Drawings reviewed', 'Materials cut & ready', 'Welded & assembled', 'Dimensions checked', 'Ready for next stage'],
  Paint: ['Surface prepped', 'Primer coat applied', 'Base coat done', 'Clear coat / cure', 'Quality check passed'],
  Fitout: ['Components on hand', 'Electrical completed', 'Hydraulics fitted', 'Final assembly done', 'Supervisor sign-off'],
  QC: ['Visual inspection', 'Measurements verified', 'Function test passed', 'Documentation complete', 'Approved for dispatch'],
}

const DAILY_CHECKS = ['Area clean and organised', 'Tools accounted for', 'Safety equipment checked', 'Job sheets up to date', 'Materials stocked']

const STAGE_COLORS: Record<string, string> = {
  'Requires Engineering': '#f97316',
  'Ready to Start': '#06b6d4',
  Fab: '#e84560',
  Paint: '#f5a623',
  Fitout: '#3b9de8',
  QC: '#a78bfa',
  Dispatch: '#22d07a',
}

type ViewMode = 'cards' | 'table' | 'board'

/* ── localStorage helpers ── */
function getJobChecks(jobNum: string, stage: string): boolean[] {
  if (typeof window === 'undefined') return new Array(5).fill(false)
  try {
    const raw = localStorage.getItem(`job-check-${jobNum}-${stage}`)
    return raw ? JSON.parse(raw) : new Array(STAGE_CHECKS[stage]?.length || 5).fill(false)
  } catch { return new Array(5).fill(false) }
}
function saveJobChecks(jobNum: string, stage: string, checks: boolean[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`job-check-${jobNum}-${stage}`, JSON.stringify(checks))
}
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function getSectionChecks(sectionKey: string): boolean[] {
  if (typeof window === 'undefined') return new Array(DAILY_CHECKS.length).fill(false)
  try {
    const raw = localStorage.getItem(`section-check-${sectionKey}-${todayKey()}`)
    return raw ? JSON.parse(raw) : new Array(DAILY_CHECKS.length).fill(false)
  } catch { return new Array(DAILY_CHECKS.length).fill(false) }
}
function saveSectionChecks(sectionKey: string, checks: boolean[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`section-check-${sectionKey}-${todayKey()}`, JSON.stringify(checks))
}

/* ── Main page ── */
export default function FloorPage() {
  const { data: session } = useSession()
  const { data: jobs, mutate: mutateJobs } = useJobs()
  const { data: workers } = useWorkers()
  const user = session?.user as any

  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [newJobModal, setNewJobModal] = useState(false)
  const [formData, setFormData] = useState({ number: '', type: '', customer: '', due: '' })
  const [submitting, setSubmitting] = useState(false)
  const [checkTick, setCheckTick] = useState(0)

  const userSectionFilter = user?.section
  const visibleSections = useMemo(() => {
    if (userSectionFilter) {
      const matched = SECTIONS.filter((s) => s.userSection === userSectionFilter)
      if (matched.length > 0) return matched
    }
    if (activeFilter === 'all') return SECTIONS
    return SECTIONS.filter((s) => s.key === activeFilter)
  }, [activeFilter, userSectionFilter])

  const getJobsForSection = useCallback(
    (section: typeof SECTIONS[0]) => {
      if (!jobs) return []
      return jobs.filter((j: any) => {
        if (j.stage !== section.stage) return false
        if (j.prodGroup !== 'issued' && j.prodGroup !== 'goahead') return false
        if (section.typeFilter) return j.type.toLowerCase().includes(section.typeFilter)
        return true
      })
    },
    [jobs]
  )

  const getWorkersForJob = useCallback(
    (jobNum: string) => {
      if (!workers) return []
      return workers.filter((w: any) => w.jobs?.some((wj: any) => wj.jobNo === jobNum))
    },
    [workers]
  )

  // For board view: group all visible jobs by stage
  const jobsByStage = useMemo(() => {
    if (!jobs) return {}
    const result: Record<string, any[]> = {}
    const activeStages = ['Fab', 'Paint', 'Fitout', 'QC', 'Dispatch']
    activeStages.forEach((s) => { result[s] = [] })
    jobs.filter((j: any) => j.prodGroup === 'issued' || j.prodGroup === 'goahead')
      .forEach((j: any) => {
        if (result[j.stage]) result[j.stage].push(j)
      })
    return result
  }, [jobs])

  const handleAdvance = async (jobId: string, jobNum: string, stage: string) => {
    if (!user?.canAdvance) return
    try {
      await advanceJob(jobId)
      localStorage.removeItem(`job-check-${jobNum}-${stage}`)
      mutateJobs()
      setCheckTick((t) => t + 1)
    } catch (e) {
      console.error('Failed to advance:', e)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.number.trim()) return
    setSubmitting(true)
    try {
      const id = formData.number.trim().toLowerCase().replace(/\s+/g, '-')
      await createJob({
        id,
        num: 'YLZ' + formData.number.trim(),
        type: formData.type.trim(),
        customer: formData.customer.trim(),
        due: formData.due.trim(),
        stage: 'Fab',
        prodGroup: 'issued',
      })
      mutateJobs()
      setNewJobModal(false)
      setFormData({ number: '', type: '', customer: '', due: '' })
    } catch (e) { console.error(e) } finally { setSubmitting(false) }
  }

  const totalJobs = useMemo(() => {
    if (!jobs) return 0
    return jobs.filter((j: any) => j.prodGroup === 'issued' || j.prodGroup === 'goahead').length
  }, [jobs])

  if (!jobs) {
    return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 13 }}>Loading workshop floor...</div>
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: '14px 24px 10px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
              WORKSHOP FLOOR
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              {totalJobs} active jobs
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {(['cards', 'table', 'board'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'League Spartan', sans-serif",
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  border: 'none',
                  borderLeft: v !== 'cards' ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  background: viewMode === v ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: viewMode === v ? '#fff' : 'var(--text3)',
                  transition: '0.15s',
                }}
              >
                {v === 'cards' ? '▦ Cards' : v === 'table' ? '☰ Table' : '▥ Board'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewJobModal(true)}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: '6px 14px',
              borderRadius: 4,
              border: '1.5px solid rgba(255,255,255,0.12)',
              background: 'var(--btn-primary)',
              color: '#f7f7f7',
              cursor: 'pointer',
            }}
          >
            + New Job
          </button>
        </div>
      </div>

      {/* Section filter tabs */}
      {!userSectionFilter && viewMode !== 'board' && (
        <div
          style={{
            padding: '8px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            background: 'var(--dark2)',
          }}
        >
          <FilterTab label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          {SECTIONS.map((s) => (
            <FilterTab key={s.key} label={s.name} color={s.color} active={activeFilter === s.key} onClick={() => setActiveFilter(s.key)} />
          ))}
        </div>
      )}

      {/* ─── CARDS VIEW ─── */}
      {viewMode === 'cards' && (
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visibleSections.map((section) => {
            const sectionJobs = getJobsForSection(section)
            if (sectionJobs.length === 0) return null
            return (
              <CompactSectionCard
                key={section.key}
                section={section}
                jobs={sectionJobs}
                user={user}
                getWorkersForJob={getWorkersForJob}
                onAdvance={handleAdvance}
                checkTick={checkTick}
                onCheckChange={() => setCheckTick((t) => t + 1)}
              />
            )
          })}
          {visibleSections.every((s) => getJobsForSection(s).length === 0) && (
            <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, padding: 32, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
              No active jobs in the selected sections
            </div>
          )}
        </div>
      )}

      {/* ─── TABLE VIEW ─── */}
      {viewMode === 'table' && (
        <div style={{ padding: '12px 24px' }}>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--dark3)' }}>
                  {['Job', 'Type', 'Customer', 'Section', 'Stage', 'Due', 'Workers', 'Progress', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleSections.flatMap((section) =>
                  getJobsForSection(section).map((job: any) => (
                    <TableJobRow
                      key={job.id}
                      job={job}
                      section={section}
                      user={user}
                      workers={getWorkersForJob(job.num)}
                      onAdvance={handleAdvance}
                      checkTick={checkTick}
                      onCheckChange={() => setCheckTick((t) => t + 1)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── BOARD VIEW ─── */}
      {viewMode === 'board' && (
        <div style={{ padding: '16px 24px', display: 'flex', gap: 10, overflowX: 'auto', alignItems: 'flex-start', minHeight: 'calc(100vh - 160px)' }}>
          {STAGES.filter((s) => s !== 'Dispatch').map((stage) => {
            const stageJobs = jobsByStage[stage] || []
            return (
              <div key={stage} style={{ flex: '1 1 0', minWidth: 220, maxWidth: 320, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 12px', background: STAGE_COLORS[stage] + '20', borderRadius: '4px 4px 0 0', borderBottom: `2px solid ${STAGE_COLORS[stage]}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: STAGE_COLORS[stage] }}>
                    {stage}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
                    {stageJobs.length}
                  </span>
                </div>
                <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 4px 4px', padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100 }}>
                  {stageJobs.map((job: any) => {
                    const checks = getJobChecks(job.num, stage)
                    const items = STAGE_CHECKS[stage] || []
                    const done = checks.filter(Boolean).length
                    const pct = items.length ? Math.round((done / items.length) * 100) : 0
                    const ws = getWorkersForJob(job.num)
                    return (
                      <div
                        key={job.id}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--dark3)',
                          border: '1px solid var(--border)',
                          borderLeft: `3px solid ${job.flag ? '#ef4444' : STAGE_COLORS[stage]}`,
                          borderRadius: 3,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700, color: '#fff' }}>
                            {job.num}
                          </span>
                          {job.flag && <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 2, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>FLAG</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.type}
                        </div>
                        {job.customer && <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{job.customer}</div>}
                        {ws.length > 0 && (
                          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
                            {ws.map((w: any) => (
                              <span key={w.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 2, background: w.color + '22', color: w.color }}>
                                {w.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: pct === 100 ? 'var(--green)' : STAGE_COLORS[stage], width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{done}/{items.length}</span>
                        </div>
                      </div>
                    )
                  })}
                  {stageJobs.length === 0 && (
                    <div style={{ padding: 16, fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>Empty</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Job Modal */}
      {newJobModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setNewJobModal(false) }}
        >
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border2)', borderRadius: 6, padding: '24px 28px', width: 380, maxWidth: '90vw' }}>
            <h3 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 18px', letterSpacing: 1.5 }}>
              NEW JOB
            </h3>
            <form onSubmit={handleCreateJob}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormField label="Job Number" value={formData.number} onChange={(v) => setFormData((p) => ({ ...p, number: v }))} placeholder="e.g. 1234" required />
                <FormField label="Type" value={formData.type} onChange={(v) => setFormData((p) => ({ ...p, type: v }))} placeholder="e.g. Hardox Trailer" />
                <FormField label="Customer" value={formData.customer} onChange={(v) => setFormData((p) => ({ ...p, customer: v }))} placeholder="Customer name" />
                <FormField label="Due Date" value={formData.due} onChange={(v) => setFormData((p) => ({ ...p, due: v }))} placeholder="DD/MM/YY" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setNewJobModal(false)} style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 4, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700, padding: '8px 20px', borderRadius: 4, border: '1.5px solid rgba(255,255,255,0.12)', background: 'var(--btn-primary)', color: '#f7f7f7', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Compact Section Card (Cards view) ── */
function CompactSectionCard({
  section, jobs, user, getWorkersForJob, onAdvance, checkTick, onCheckChange,
}: {
  section: typeof SECTIONS[0]; jobs: any[]; user: any
  getWorkersForJob: (num: string) => any[]
  onAdvance: (id: string, num: string, stage: string) => void
  checkTick: number; onCheckChange: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showDaily, setShowDaily] = useState(false)
  const [dailyChecks, setDailyChecks] = useState<boolean[]>(() => getSectionChecks(section.key))
  const nxt = nextStage(section.stage)

  function toggleDailyCheck(idx: number) {
    setDailyChecks((prev) => {
      const next = [...prev]
      next[idx] = !next[idx]
      saveSectionChecks(section.key, next)
      return next
    })
  }

  const dailyDone = dailyChecks.filter(Boolean).length

  return (
    <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      {/* Section header — clickable to collapse */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '8px 16px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--dark3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', transition: '0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: section.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 1.2, color: '#fff' }}>
            {section.name.toUpperCase()}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>— {section.team}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: STAGE_COLORS[section.stage], textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {section.stage}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>
            {jobs.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDaily(!showDaily) }}
            style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: dailyDone === DAILY_CHECKS.length ? 'var(--green)' : 'var(--text3)', cursor: 'pointer' }}
          >
            Daily {dailyDone}/{DAILY_CHECKS.length}
          </button>
        </div>
      </div>

      {/* Daily checks (toggleable) */}
      {showDaily && !collapsed && (
        <div style={{ padding: '6px 16px', background: 'var(--dark3)', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
          {DAILY_CHECKS.map((item, idx) => (
            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, color: dailyChecks[idx] ? 'var(--green)' : 'var(--text2)', padding: '2px 0' }}>
              <input type="checkbox" checked={dailyChecks[idx]} onChange={() => toggleDailyCheck(idx)} style={{ accentColor: 'var(--green)', width: 12, height: 12 }} />
              <span style={{ textDecoration: dailyChecks[idx] ? 'line-through' : 'none', opacity: dailyChecks[idx] ? 0.6 : 1 }}>{item}</span>
            </label>
          ))}
        </div>
      )}

      {/* Job rows */}
      {!collapsed && (
        <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {jobs.map((job: any) => (
            <CompactJobRow
              key={job.id}
              job={job}
              stage={section.stage}
              nextStageName={nxt}
              user={user}
              workers={getWorkersForJob(job.num)}
              onAdvance={onAdvance}
              checkTick={checkTick}
              onCheckChange={onCheckChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Compact Job Row (Cards view) ── */
function CompactJobRow({
  job, stage, nextStageName, user, workers, onAdvance, checkTick, onCheckChange,
}: {
  job: any; stage: string; nextStageName: string | null; user: any; workers: any[]
  onAdvance: (id: string, num: string, stage: string) => void
  checkTick: number; onCheckChange: () => void
}) {
  const checkItems = STAGE_CHECKS[stage] || []
  const [checks, setChecks] = useState<boolean[]>(() => getJobChecks(job.num, stage))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { setChecks(getJobChecks(job.num, stage)) }, [job.num, stage, checkTick])

  function toggleCheck(idx: number) {
    setChecks((prev) => {
      const next = [...prev]
      next[idx] = !next[idx]
      saveJobChecks(job.num, stage, next)
      onCheckChange()
      return next
    })
  }

  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === checkItems.length && checkItems.length > 0
  const progress = checkItems.length ? Math.round((doneCount / checkItems.length) * 100) : 0

  return (
    <div style={{ background: 'var(--dark3)', border: '1px solid var(--border)', borderLeft: `3px solid ${job.flag ? '#ef4444' : STAGE_COLORS[stage]}`, borderRadius: 3, padding: '8px 12px' }}>
      {/* Main row — compact */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Job info */}
        <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 70 }}>
          {job.num}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text2)', flex: '1 1 120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {job.type}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text3)', flex: '0 1 100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {job.customer || '—'}
        </span>
        {job.due && <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>Due: {job.due}</span>}

        {/* Workers */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {workers.slice(0, 3).map((w: any) => (
            <span key={w.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 2, background: w.color + '22', color: w.color }}>
              {w.name}
            </span>
          ))}
          {workers.length > 3 && <span style={{ fontSize: 8, color: 'var(--text3)' }}>+{workers.length - 3}</span>}
        </div>

        {/* Progress bar inline */}
        <div style={{ width: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: allDone ? 'var(--green)' : STAGE_COLORS[stage], width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{doneCount}/{checkItems.length}</span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 9, padding: '3px 6px', borderRadius: 3, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', flexShrink: 0 }}
        >
          {expanded ? '▲' : '▼'}
        </button>

        {/* Advance */}
        {nextStageName && user?.canAdvance && allDone && (
          <button
            onClick={() => onAdvance(job.id, job.num, stage)}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 3,
              cursor: 'pointer',
              border: '1px solid var(--green)',
              background: 'rgba(34,208,122,0.12)',
              color: 'var(--green)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            → {nextStageName}
          </button>
        )}
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
          {checkItems.map((item, idx) => (
            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, color: checks[idx] ? 'var(--green)' : 'var(--text2)', padding: '2px 0', minWidth: 160 }}>
              <input type="checkbox" checked={checks[idx] || false} onChange={() => toggleCheck(idx)} style={{ accentColor: 'var(--green)', width: 12, height: 12 }} />
              <span style={{ textDecoration: checks[idx] ? 'line-through' : 'none', opacity: checks[idx] ? 0.6 : 1 }}>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Table Job Row ── */
function TableJobRow({
  job, section, user, workers, onAdvance, checkTick, onCheckChange,
}: {
  job: any; section: typeof SECTIONS[0]; user: any; workers: any[]
  onAdvance: (id: string, num: string, stage: string) => void
  checkTick: number; onCheckChange: () => void
}) {
  const checkItems = STAGE_CHECKS[section.stage] || []
  const [checks, setChecks] = useState<boolean[]>(() => getJobChecks(job.num, section.stage))
  const [showChecks, setShowChecks] = useState(false)

  useEffect(() => { setChecks(getJobChecks(job.num, section.stage)) }, [job.num, section.stage, checkTick])

  function toggleCheck(idx: number) {
    setChecks((prev) => {
      const next = [...prev]
      next[idx] = !next[idx]
      saveJobChecks(job.num, section.stage, next)
      onCheckChange()
      return next
    })
  }

  const doneCount = checks.filter(Boolean).length
  const allDone = doneCount === checkItems.length && checkItems.length > 0
  const pct = checkItems.length ? Math.round((doneCount / checkItems.length) * 100) : 0
  const nxt = nextStage(section.stage)

  return (
    <>
      <tr
        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => setShowChecks(!showChecks)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#fff', fontSize: 12, whiteSpace: 'nowrap' }}>
          {job.flag && <span style={{ color: '#ef4444', marginRight: 4 }}>●</span>}
          {job.num}
        </td>
        <td style={{ padding: '6px 10px', color: 'var(--text2)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.type}</td>
        <td style={{ padding: '6px 10px', color: 'var(--text3)', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.customer || '—'}</td>
        <td style={{ padding: '6px 10px' }}>
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2, background: section.color + '22', color: section.color }}>
            {section.name.split(' ')[0]}
          </span>
        </td>
        <td style={{ padding: '6px 10px' }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 2, background: STAGE_COLORS[section.stage] + '22', color: STAGE_COLORS[section.stage], textTransform: 'uppercase' }}>
            {section.stage}
          </span>
        </td>
        <td style={{ padding: '6px 10px', color: 'var(--text3)', fontSize: 11 }}>{job.due || '—'}</td>
        <td style={{ padding: '6px 10px' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {workers.slice(0, 2).map((w: any) => (
              <span key={w.id} style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 2, background: w.color + '22', color: w.color }}>{w.name}</span>
            ))}
            {workers.length > 2 && <span style={{ fontSize: 8, color: 'var(--text3)' }}>+{workers.length - 2}</span>}
          </div>
        </td>
        <td style={{ padding: '6px 10px', width: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: allDone ? 'var(--green)' : STAGE_COLORS[section.stage], width: `${pct}%` }} />
            </div>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{doneCount}/{checkItems.length}</span>
          </div>
        </td>
        <td style={{ padding: '6px 10px' }}>
          {nxt && user?.canAdvance && allDone && (
            <button
              onClick={(e) => { e.stopPropagation(); onAdvance(job.id, job.num, section.stage) }}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid var(--green)',
                background: 'rgba(34,208,122,0.12)',
                color: 'var(--green)',
                whiteSpace: 'nowrap',
              }}
            >
              → {nxt}
            </button>
          )}
        </td>
      </tr>
      {showChecks && (
        <tr>
          <td colSpan={9} style={{ padding: '6px 10px 8px 30px', background: 'var(--dark3)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
              {checkItems.map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, color: checks[idx] ? 'var(--green)' : 'var(--text2)', padding: '2px 0' }}>
                  <input type="checkbox" checked={checks[idx] || false} onChange={() => toggleCheck(idx)} style={{ accentColor: 'var(--green)', width: 12, height: 12 }} />
                  <span style={{ textDecoration: checks[idx] ? 'line-through' : 'none', opacity: checks[idx] ? 0.6 : 1 }}>{item}</span>
                </label>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ── Filter Tab ── */
function FilterTab({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.3,
        padding: '5px 10px',
        borderRadius: 3,
        cursor: 'pointer',
        border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--border)',
        background: active ? 'var(--btn-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text3)',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        transition: 'all 0.15s',
      }}
    >
      {color && <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
      {label}
    </button>
  )
}

/* ── Form Field ── */
function FormField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: '100%', fontFamily: "'League Spartan', sans-serif", fontSize: 13, padding: '8px 10px', borderRadius: 3, border: '1px solid var(--border2)', background: 'var(--dark3)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#fff' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)' }}
      />
    </div>
  )
}
