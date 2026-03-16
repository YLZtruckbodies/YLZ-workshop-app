'use client'

import { useSession } from 'next-auth/react'
import { useJobs, useWorkers, advanceJob, createJob } from '@/lib/hooks'
import { STAGES, stageIndex } from '@/lib/jobTypes'
import { useState, useMemo } from 'react'

const STAGE_COLORS: Record<string, string> = {
  'Requires Engineering': '#f97316',
  'Ready to Start': '#06b6d4',
  Fab: '#3b9de8',
  Paint: '#a259ff',
  Fitout: '#f5a623',
  QC: '#3b9de8',
  Dispatch: '#22d07a',
}

export default function TrackerPage() {
  const { data: session } = useSession()
  const { data: jobs, mutate: mutateJobs } = useJobs()
  const { data: workers } = useWorkers()
  const user = session?.user as any

  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    number: '',
    type: '',
    customer: '',
    due: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const jobsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    for (const s of STAGES) {
      grouped[s] = []
    }
    if (jobs) {
      for (const job of jobs) {
        if (grouped[job.stage]) {
          grouped[job.stage].push(job)
        }
      }
    }
    return grouped
  }, [jobs])

  const pairedMap = useMemo(() => {
    if (!jobs) return new Map<string, any>()
    const m = new Map<string, any>()
    for (const j of jobs) {
      m.set(j.id, j)
    }
    return m
  }, [jobs])

  // Track which jobs are the "second" in a pair so we don't double-render
  const pairedSecondIds = useMemo(() => {
    if (!jobs) return new Set<string>()
    const s = new Set<string>()
    for (const j of jobs) {
      if (j.pairedId) {
        const partner = pairedMap.get(j.pairedId)
        if (partner && partner.pairedId === j.id) {
          // Only mark the one with the lexicographically greater id
          if (j.id > j.pairedId) {
            s.add(j.id)
          }
        }
      }
    }
    return s
  }, [jobs, pairedMap])

  const getWorkersForJob = (jobId: string, jobNum: string) => {
    if (!workers) return []
    return workers.filter((w: any) =>
      w.jobs?.some((wj: any) => wj.jobNo === jobNum)
    )
  }

  const totalJobCount = jobs?.length || 0

  const handleAdvance = async (jobId: string) => {
    if (!user?.canAdvance) return
    try {
      await advanceJob(jobId)
      mutateJobs()
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
      setModalOpen(false)
      setFormData({ number: '', type: '', customer: '', due: '' })
    } catch (e) {
      console.error('Failed to create job:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!jobs) {
    return (
      <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>
        Loading job tracker...
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '24px 28px',
        fontFamily: "'League Spartan', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              letterSpacing: 2,
              lineHeight: 1,
            }}
          >
            JOB TRACKER
          </h1>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text3)',
              marginTop: 4,
              letterSpacing: 0.3,
            }}
          >
            {totalJobCount} jobs &middot; click any card to advance stage
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: '8px 18px',
            borderRadius: 4,
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'var(--btn-primary)',
            color: '#f7f7f7',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          + New Job
        </button>
      </div>

      {/* Kanban Board */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 8,
        }}
      >
        {STAGES.map((stage) => {
          const stageJobs = jobsByStage[stage] || []
          const visibleJobs = stageJobs.filter(
            (j: any) => !pairedSecondIds.has(j.id)
          )

          return (
            <div
              key={stage}
              style={{
                background: 'var(--dark2)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                minWidth: 200,
                maxWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '12px 14px 10px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: STAGE_COLORS[stage] || 'var(--text2)',
                  }}
                >
                  {stage}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text3)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 7px',
                    borderRadius: 10,
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {stageJobs.length}
                </span>
              </div>

              {/* Cards */}
              <div
                style={{
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {visibleJobs.map((job: any) => {
                  const pairedPartner =
                    job.pairedId ? pairedMap.get(job.pairedId) : null
                  const isPaired =
                    pairedPartner && pairedPartner.pairedId === job.id

                  if (isPaired) {
                    return (
                      <PairedCard
                        key={job.id}
                        jobA={job}
                        jobB={pairedPartner}
                        stage={stage}
                        user={user}
                        workers={workers}
                        getWorkersForJob={getWorkersForJob}
                        onAdvance={handleAdvance}
                      />
                    )
                  }

                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      stage={stage}
                      user={user}
                      workers={workers}
                      getWorkersForJob={getWorkersForJob}
                      onAdvance={handleAdvance}
                    />
                  )
                })}

                {visibleJobs.length === 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text3)',
                      textAlign: 'center',
                      padding: '16px 0',
                      opacity: 0.6,
                    }}
                  >
                    No jobs
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* New Job Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            style={{
              background: 'var(--dark2)',
              border: '1px solid var(--border2)',
              borderRadius: 6,
              padding: '24px 28px',
              width: 380,
              maxWidth: '90vw',
            }}
          >
            <h3
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 18px 0',
                letterSpacing: 1.5,
              }}
            >
              NEW JOB
            </h3>
            <form onSubmit={handleCreateJob}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <FormField
                  label="Job Number"
                  value={formData.number}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, number: v }))
                  }
                  placeholder="e.g. 1234"
                  required
                />
                <FormField
                  label="Type"
                  value={formData.type}
                  onChange={(v) => setFormData((p) => ({ ...p, type: v }))}
                  placeholder="e.g. Hardox Trailer"
                />
                <FormField
                  label="Customer"
                  value={formData.customer}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, customer: v }))
                  }
                  placeholder="Customer name"
                />
                <FormField
                  label="Due Date"
                  value={formData.due}
                  onChange={(v) => setFormData((p) => ({ ...p, due: v }))}
                  placeholder="DD/MM/YY"
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 20,
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 4,
                    border: '1px solid var(--border2)',
                    background: 'transparent',
                    color: 'var(--text2)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 20px',
                    borderRadius: 4,
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    background: 'var(--btn-primary)',
                    color: '#f7f7f7',
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
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

/* ── Job Card ── */
function JobCard({
  job,
  stage,
  user,
  workers,
  getWorkersForJob,
  onAdvance,
}: {
  job: any
  stage: string
  user: any
  workers: any[] | undefined
  getWorkersForJob: (id: string, num: string) => any[]
  onAdvance: (id: string) => void
}) {
  const assignedWorkers = getWorkersForJob(job.id, job.num)
  const currentStageIdx = stageIndex(job.stage)
  const hasWorkers = assignedWorkers.length > 0

  return (
    <div
      onClick={() => onAdvance(job.id)}
      style={{
        background: 'var(--dark3)',
        border: '1px solid var(--border2)',
        borderRadius: 3,
        padding: '11px 12px',
        cursor: user?.canAdvance ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (user?.canAdvance) {
          e.currentTarget.style.borderColor = '#fff'
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border2)'
        e.currentTarget.style.background = 'var(--dark3)'
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 0.8,
            lineHeight: 1,
          }}
        >
          {job.num}
        </span>
        {job.flag ? (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 2,
              background: 'rgba(232,69,96,0.15)',
              color: 'var(--red)',
              border: '1px solid rgba(232,69,96,0.3)',
            }}
          >
            Flagged
          </span>
        ) : (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 2,
              background: 'rgba(34,208,122,0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(34,208,122,0.25)',
            }}
          >
            On Track
          </span>
        )}
      </div>

      {/* Type */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text3)',
          fontWeight: 500,
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {job.type}
      </div>

      {/* Customer */}
      <div
        style={{
          fontSize: 10,
          color: 'var(--text3)',
          opacity: 0.7,
          marginBottom: 6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {job.customer}
      </div>

      {/* Workers */}
      {hasWorkers ? (
        <div
          style={{
            fontSize: 9,
            color: 'var(--text2)',
            marginBottom: 6,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {assignedWorkers.map((w: any) => (
            <span
              key={w.id}
              style={{
                background: w.color + '22',
                color: w.color,
                padding: '1px 5px',
                borderRadius: 2,
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              {w.name}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--amber)',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--amber)',
              flexShrink: 0,
            }}
          />
          Not Scheduled
        </div>
      )}

      {/* Stage Dots */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {STAGES.map((s, i) => {
          let dotColor = 'rgba(255,255,255,0.12)'
          if (i < currentStageIdx) dotColor = 'var(--green)'
          else if (i === currentStageIdx) dotColor = '#fff'
          return (
            <div
              key={s}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: dotColor,
                transition: 'background 0.2s',
              }}
              title={s}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Paired Card ── */
function PairedCard({
  jobA,
  jobB,
  stage,
  user,
  workers,
  getWorkersForJob,
  onAdvance,
}: {
  jobA: any
  jobB: any
  stage: string
  user: any
  workers: any[] | undefined
  getWorkersForJob: (id: string, num: string) => any[]
  onAdvance: (id: string) => void
}) {
  const currentStageIdx = stageIndex(jobA.stage)
  const workersA = getWorkersForJob(jobA.id, jobA.num)
  const workersB = getWorkersForJob(jobB.id, jobB.num)
  const allWorkers = [
    ...workersA,
    ...workersB.filter(
      (wb: any) => !workersA.some((wa: any) => wa.id === wb.id)
    ),
  ]
  const hasWorkers = allWorkers.length > 0

  return (
    <div
      onClick={() => onAdvance(jobA.id)}
      style={{
        background: 'var(--dark3)',
        border: '1px solid var(--border2)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 3,
        padding: '11px 12px',
        cursor: user?.canAdvance ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (user?.canAdvance) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--dark3)'
      }}
    >
      {/* Paired header */}
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: 'var(--amber)',
          marginBottom: 6,
        }}
      >
        PAIRED BUILD
      </div>

      {/* Two halves side by side */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[jobA, jobB].map((job: any) => (
          <div key={job.id} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: 0.5,
                lineHeight: 1,
                marginBottom: 2,
              }}
            >
              {job.num}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--text3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {job.type}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'var(--text3)',
                opacity: 0.6,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {job.customer}
            </div>
          </div>
        ))}
      </div>

      {/* Status tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        {jobA.flag || jobB.flag ? (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 2,
              background: 'rgba(232,69,96,0.15)',
              color: 'var(--red)',
              border: '1px solid rgba(232,69,96,0.3)',
            }}
          >
            Flagged
          </span>
        ) : (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: 2,
              background: 'rgba(34,208,122,0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(34,208,122,0.25)',
            }}
          >
            On Track
          </span>
        )}
      </div>

      {/* Workers */}
      {hasWorkers ? (
        <div
          style={{
            fontSize: 9,
            color: 'var(--text2)',
            marginTop: 5,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {allWorkers.map((w: any) => (
            <span
              key={w.id}
              style={{
                background: w.color + '22',
                color: w.color,
                padding: '1px 5px',
                borderRadius: 2,
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              {w.name}
            </span>
          ))}
        </div>
      ) : (
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--amber)',
            marginTop: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--amber)',
              flexShrink: 0,
            }}
          />
          Not Scheduled
        </div>
      )}

      {/* Stage Dots */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        {STAGES.map((s, i) => {
          let dotColor = 'rgba(255,255,255,0.12)'
          if (i < currentStageIdx) dotColor = 'var(--green)'
          else if (i === currentStageIdx) dotColor = '#fff'
          return (
            <div
              key={s}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: dotColor,
              }}
              title={s}
            />
          )
        })}
      </div>
    </div>
  )
}

/* ── Form Field ── */
function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--text3)',
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 13,
          padding: '8px 10px',
          borderRadius: 3,
          border: '1px solid var(--border2)',
          background: 'var(--dark3)',
          color: '#fff',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#fff'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border2)'
        }}
      />
    </div>
  )
}
