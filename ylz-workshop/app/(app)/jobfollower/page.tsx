'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useJobs } from '@/lib/hooks'

/* ── Follower phases: chassis through to delivery ── */
const FOLLOWER_PHASES = [
  {
    key: 'pre-production',
    name: 'Pre-Production',
    color: '#f5a623',
    icon: '📋',
    items: [
      'Job sheet received',
      'Drawings issued',
      'MRP completed',
      'Parts ordered',
      'EBS file ready',
      'Chassis / truck on site',
    ],
  },
  {
    key: 'fabrication',
    name: 'Fabrication',
    color: '#e84560',
    icon: '🔩',
    items: [
      'Drawings reviewed by fab team',
      'Materials cut & ready',
      'Main frame / body fabricated',
      'Sub-assemblies welded',
      'Dimensions verified',
      'Fab supervisor sign-off',
    ],
  },
  {
    key: 'paint',
    name: 'Paint',
    color: '#3b9de8',
    icon: '🎨',
    items: [
      'Surface prep / blasted',
      'Primer coat applied',
      'Base coat applied',
      'Clear coat / cured',
      'Paint QC passed',
    ],
  },
  {
    key: 'fitout',
    name: 'Fitout',
    color: '#f5a623',
    icon: '🔧',
    items: [
      'All parts & components on hand',
      'Electrical wiring complete',
      'Hydraulics fitted & tested',
      'Doors / gates / hardware fitted',
      'Decals / signage applied',
      'Final assembly complete',
      'Fitout supervisor sign-off',
    ],
  },
  {
    key: 'qc',
    name: 'QC / Inspection',
    color: '#a855f7',
    icon: '✅',
    items: [
      'Visual inspection passed',
      'Dimensional check passed',
      'Electrical test passed',
      'Hydraulic / function test passed',
      'Compliance plate fitted',
      'Documentation complete',
      'QC manager sign-off',
    ],
  },
  {
    key: 'dispatch',
    name: 'Dispatch & Delivery',
    color: '#22d07a',
    icon: '🚚',
    items: [
      'Final clean & detail',
      'Photos taken',
      'Customer / dealer notified',
      'Loaded for transport',
      'Delivered',
      'Delivery docket signed',
    ],
  },
]

const TOTAL_ITEMS = FOLLOWER_PHASES.reduce((sum, p) => sum + p.items.length, 0)

function makeCheckKey(phaseKey: string, item: string) {
  return `${phaseKey}.${item.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`
}

type CheckMap = Record<string, { checked: boolean; checkedBy: string; checkedAt: string | null }>

/* ── Main page ── */
export default function JobFollowerPage() {
  const { data: session } = useSession()
  const { data: jobs } = useJobs()
  const user = session?.user as any

  const [selectedJob, setSelectedJob] = useState('')
  const [checks, setChecks] = useState<CheckMap>({})
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [printMode, setPrintMode] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  // Active jobs (issued / goahead) for the selector
  const activeJobs = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j: any) => j.prodGroup !== 'finished')
      .sort((a: any, b: any) => a.num.localeCompare(b.num))
  }, [jobs])

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return activeJobs
    const q = search.toLowerCase()
    return activeJobs.filter(
      (j: any) =>
        j.num.toLowerCase().includes(q) ||
        j.type.toLowerCase().includes(q) ||
        j.customer.toLowerCase().includes(q)
    )
  }, [activeJobs, search])

  const currentJob = useMemo(() => {
    if (!jobs || !selectedJob) return null
    return jobs.find((j: any) => j.num === selectedJob) || null
  }, [jobs, selectedJob])

  // Fetch checks when job changes
  const fetchChecks = useCallback(async (jobNum: string) => {
    if (!jobNum) { setChecks({}); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/jobfollower?jobNum=${encodeURIComponent(jobNum)}`)
      const data = await res.json()
      setChecks(data)
    } catch { setChecks({}) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (selectedJob) fetchChecks(selectedJob) }, [selectedJob, fetchChecks])

  // Toggle a check
  async function toggleCheck(phaseKey: string, item: string) {
    const checkKey = makeCheckKey(phaseKey, item)
    const current = checks[checkKey]?.checked || false
    const newChecked = !current

    // Optimistic update
    setChecks((prev) => ({
      ...prev,
      [checkKey]: {
        checked: newChecked,
        checkedBy: newChecked ? (user?.name || '') : '',
        checkedAt: newChecked ? new Date().toISOString() : null,
      },
    }))

    try {
      await fetch('/api/jobfollower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNum: selectedJob,
          checkKey,
          checked: newChecked,
          checkedBy: user?.name || '',
        }),
      })
    } catch {
      // Revert on error
      fetchChecks(selectedJob)
    }
  }

  // Stats
  const totalChecked = Object.values(checks).filter((c) => c.checked).length
  const overallPct = TOTAL_ITEMS ? Math.round((totalChecked / TOTAL_ITEMS) * 100) : 0

  function getPhaseStats(phase: typeof FOLLOWER_PHASES[0]) {
    const done = phase.items.filter((item) => {
      const key = makeCheckKey(phase.key, item)
      return checks[key]?.checked
    }).length
    return { done, total: phase.items.length, pct: phase.items.length ? Math.round((done / phase.items.length) * 100) : 0 }
  }

  // Print
  function handlePrint() {
    setPrintMode(true)
    setTimeout(() => {
      window.print()
      setPrintMode(false)
    }, 200)
  }

  if (!jobs) {
    return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 13 }}>Loading jobs...</div>
  }

  return (
    <div ref={printRef}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #job-follower-print, #job-follower-print * { visibility: visible; }
          #job-follower-print { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; padding: 20px; }
          .no-print { display: none !important; }
          .print-phase { break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; border: 1px solid #ccc !important; }
          .print-check { color: #000 !important; }
          .print-header { color: #000 !important; border-bottom: 2px solid #000 !important; }
        }
      `}</style>

      {/* Header */}
      <div
        className="no-print"
        style={{
          padding: '14px 24px 10px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
            JOB FOLLOWER
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            Track every job from chassis to delivery
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedJob && (
            <button
              onClick={handlePrint}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: '6px 14px',
                borderRadius: 4,
                border: '1.5px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'var(--text2)',
                cursor: 'pointer',
              }}
            >
              🖨 Print
            </button>
          )}
        </div>
      </div>

      {/* Job selector */}
      <div
        className="no-print"
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--dark2)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', flexShrink: 0 }}>
          Select Job
        </label>
        <div style={{ position: 'relative', flex: '0 1 320px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job number, type, or customer..."
            style={{
              width: '100%',
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid var(--border2)',
              background: 'var(--dark3)',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#fff' }}
            onBlur={(e) => { setTimeout(() => { e.currentTarget.style.borderColor = 'var(--border2)' }, 200) }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, maxHeight: 120, overflowY: 'auto' }}>
          {filteredJobs.slice(0, 30).map((job: any) => (
            <button
              key={job.id}
              onClick={() => { setSelectedJob(job.num); setSearch('') }}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 11,
                fontWeight: selectedJob === job.num ? 800 : 600,
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                border: selectedJob === job.num ? '1.5px solid #fff' : '1px solid var(--border)',
                background: selectedJob === job.num ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: selectedJob === job.num ? '#fff' : 'var(--text3)',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s',
              }}
            >
              {job.num}
            </button>
          ))}
          {filteredJobs.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>No jobs found</span>
          )}
        </div>
      </div>

      {/* No job selected state */}
      {!selectedJob && (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1 }}>
            SELECT A JOB TO VIEW ITS FOLLOWER
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, opacity: 0.6 }}>
            Choose a job number above to track its progress from start to finish
          </div>
        </div>
      )}

      {/* Job follower content */}
      {selectedJob && (
        <div id="job-follower-print" style={{ padding: '16px 24px' }}>
          {/* Job info bar + overall progress */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 16,
              padding: '14px 18px',
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}
          >
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: 1.5 }}>
                {selectedJob}
              </div>
              {currentJob && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {currentJob.type}{currentJob.customer ? ` — ${currentJob.customer}` : ''}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 36, background: 'var(--border)', flexShrink: 0 }} />
            {currentJob && (
              <>
                {currentJob.dealer && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)' }}>Dealer</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{currentJob.dealer}</div>
                  </div>
                )}
                {currentJob.due && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)' }}>Due</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{currentJob.due}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)' }}>Stage</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{currentJob.stage}</div>
                </div>
              </>
            )}
            {/* Overall progress */}
            <div style={{ marginLeft: 'auto', textAlign: 'right', minWidth: 140 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
                Overall Progress
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 3,
                      background: overallPct === 100 ? '#22d07a' : overallPct > 50 ? '#3b9de8' : '#f5a623',
                      width: `${overallPct}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <span style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 14, fontWeight: 800, color: overallPct === 100 ? '#22d07a' : '#fff' }}>
                  {overallPct}%
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                {totalChecked} / {TOTAL_ITEMS} completed
              </div>
            </div>
          </div>

          {/* Phase progress summary strip */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              marginBottom: 16,
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 6,
              overflow: 'hidden',
            }}
          >
            {FOLLOWER_PHASES.map((phase) => {
              const stats = getPhaseStats(phase)
              const isComplete = stats.done === stats.total
              return (
                <div
                  key={phase.key}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: 3,
                    background: isComplete ? phase.color + '18' : 'transparent',
                    border: isComplete ? `1px solid ${phase.color}40` : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{phase.icon}</div>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: isComplete ? phase.color : 'var(--text3)' }}>
                    {phase.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isComplete ? phase.color : 'var(--text3)', marginTop: 2 }}>
                    {stats.done}/{stats.total}
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: isComplete ? phase.color : phase.color + '80', width: `${stats.pct}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Loading indicator */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text3)' }}>
              Loading checks...
            </div>
          )}

          {/* Phase checklist cards */}
          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FOLLOWER_PHASES.map((phase) => (
                <PhaseCard
                  key={phase.key}
                  phase={phase}
                  checks={checks}
                  onToggle={toggleCheck}
                  userName={user?.name || ''}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Phase Card ── */
function PhaseCard({
  phase,
  checks,
  onToggle,
  userName,
}: {
  phase: typeof FOLLOWER_PHASES[0]
  checks: CheckMap
  onToggle: (phaseKey: string, item: string) => void
  userName: string
}) {
  const [collapsed, setCollapsed] = useState(false)

  const done = phase.items.filter((item) => {
    const key = makeCheckKey(phase.key, item)
    return checks[key]?.checked
  }).length
  const total = phase.items.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const isComplete = done === total

  return (
    <div
      className="print-phase"
      style={{
        background: 'var(--dark2)',
        border: `1px solid ${isComplete ? phase.color + '50' : 'var(--border)'}`,
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Phase header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '10px 16px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isComplete ? phase.color + '0a' : 'var(--dark3)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', transition: '0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <span style={{ fontSize: 16 }}>{phase.icon}</span>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: phase.color,
              flexShrink: 0,
            }}
          />
          <span
            className="print-header"
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 1.2,
              color: isComplete ? phase.color : '#fff',
            }}
          >
            {phase.name.toUpperCase()}
          </span>
          {isComplete && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 2,
                background: phase.color + '20',
                color: phase.color,
                letterSpacing: 0.5,
              }}
            >
              COMPLETE
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                background: isComplete ? phase.color : phase.color + '80',
                width: `${pct}%`,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: isComplete ? phase.color : 'var(--text3)', minWidth: 28, textAlign: 'right' }}>
            {done}/{total}
          </span>
        </div>
      </div>

      {/* Check items */}
      {!collapsed && (
        <div style={{ padding: '8px 12px' }}>
          {phase.items.map((item, idx) => {
            const checkKey = makeCheckKey(phase.key, item)
            const check = checks[checkKey]
            const isChecked = check?.checked || false

            return (
              <div
                key={idx}
                onClick={() => onToggle(phase.key, item)}
                className="print-check"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 10px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: isChecked ? phase.color + '08' : 'transparent',
                  borderBottom: idx < phase.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isChecked ? phase.color + '08' : 'transparent' }}
              >
                {/* Custom checkbox */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 3,
                    border: `2px solid ${isChecked ? phase.color : 'rgba(255,255,255,0.2)'}`,
                    background: isChecked ? phase.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {isChecked && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7L6 10L11 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Item label */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: isChecked ? 600 : 500,
                    color: isChecked ? phase.color : 'var(--text2)',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    opacity: isChecked ? 0.8 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {item}
                </span>

                {/* Checked by / timestamp */}
                {isChecked && check?.checkedBy && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: phase.color, opacity: 0.7 }}>
                      {check.checkedBy}
                    </div>
                    {check.checkedAt && (
                      <div style={{ fontSize: 8, color: 'var(--text3)' }}>
                        {formatDate(check.checkedAt)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const day = d.getDate()
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
    const h = d.getHours()
    const m = d.getMinutes().toString().padStart(2, '0')
    const ampm = h >= 12 ? 'pm' : 'am'
    const hr = h % 12 || 12
    return `${day} ${mon} ${hr}:${m}${ampm}`
  } catch { return '' }
}
