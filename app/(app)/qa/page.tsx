'use client'

import { useSession } from 'next-auth/react'
import { useJobs, advanceJob, useNotes, createNote, uploadJobPhoto } from '@/lib/hooks'
import { useState, useMemo, useCallback, useEffect } from 'react'

/* ── QA Checklist items ──────────────────────────────── */

const QA_CHECKLIST = [
  { key: 'welds', label: 'Weld Quality', desc: 'All welds inspected — no cracks, porosity or undercut' },
  { key: 'dims', label: 'Dimensions', desc: 'Body/trailer dims match drawing specs' },
  { key: 'paint', label: 'Paint / Finish', desc: 'Paint coverage, colour match, no runs or chips' },
  { key: 'fitout', label: 'Fitout Complete', desc: 'All fitout items installed and secured' },
  { key: 'electrics', label: 'Electrics / Lights', desc: 'Wiring, lights, indicators all working' },
  { key: 'hydraulics', label: 'Hydraulics', desc: 'Hydraulic system tested — no leaks, full operation' },
  { key: 'hardware', label: 'Hardware / Fasteners', desc: 'All bolts torqued, pins, latches, hinges correct' },
  { key: 'safety', label: 'Safety Items', desc: 'Guards, reflectors, mudflaps, signage fitted' },
  { key: 'clean', label: 'Clean / Presentable', desc: 'Cleaned, no swarf/debris, ready for customer' },
]

type CheckState = 'unchecked' | 'pass' | 'fail'

function getStoredChecks(jobId: string): Record<string, CheckState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`qa_${jobId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function storeChecks(jobId: string, checks: Record<string, CheckState>) {
  localStorage.setItem(`qa_${jobId}`, JSON.stringify(checks))
}

/* ── Main Component ──────────────────────────────────── */

export default function QAPage() {
  const { data: session } = useSession()
  const { data: jobs, mutate } = useJobs()
  const { data: notes } = useNotes({ type: 'holdup' })
  const { data: finalQaNotes, mutate: mutateFinalQa } = useNotes({ type: 'qa-final-report' })
  const user = session?.user as any

  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [checksMap, setChecksMap] = useState<Record<string, Record<string, CheckState>>>({})
  const [noteText, setNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Final QA upload modal state
  const [qaUploadJobId, setQaUploadJobId] = useState<string | null>(null)
  const [qaUploadFiles, setQaUploadFiles] = useState<File[]>([])
  const [qaUploadCaption, setQaUploadCaption] = useState('')
  const [qaUploading, setQaUploading] = useState(false)

  // Jobs in QC stage
  const qcJobs = useMemo(() => {
    if (!jobs) return []
    return (jobs as any[]).filter((j) => j.stage === 'QC')
  }, [jobs])

  // Jobs approaching QC (Fitout stage)
  const upcomingJobs = useMemo(() => {
    if (!jobs) return []
    return (jobs as any[]).filter((j) => j.stage === 'Fitout')
  }, [jobs])

  // Active holdups per job
  const holdupsByJob = useMemo(() => {
    if (!notes) return {} as Record<string, any[]>
    const map: Record<string, any[]> = {}
    for (const n of notes as any[]) {
      if (!map[n.jobId]) map[n.jobId] = []
      map[n.jobId].push(n)
    }
    return map
  }, [notes])

  // Final QA photos per job
  const finalQaByJob = useMemo(() => {
    if (!finalQaNotes) return {} as Record<string, any[]>
    const map: Record<string, any[]> = {}
    for (const n of finalQaNotes as any[]) {
      if (!map[n.jobId]) map[n.jobId] = []
      map[n.jobId].push(n)
    }
    return map
  }, [finalQaNotes])

  // Load checks from localStorage on mount
  useEffect(() => {
    const map: Record<string, Record<string, CheckState>> = {}
    for (const job of qcJobs) {
      map[job.id] = getStoredChecks(job.id)
    }
    setChecksMap(map)
  }, [qcJobs])

  const toggleCheck = useCallback((jobId: string, key: string) => {
    setChecksMap((prev) => {
      const jobChecks = { ...(prev[jobId] || {}) }
      const current = jobChecks[key] || 'unchecked'
      // Cycle: unchecked → pass → fail → unchecked
      if (current === 'unchecked') jobChecks[key] = 'pass'
      else if (current === 'pass') jobChecks[key] = 'fail'
      else jobChecks[key] = 'unchecked'
      storeChecks(jobId, jobChecks)
      return { ...prev, [jobId]: jobChecks }
    })
  }, [])

  const getJobProgress = useCallback((jobId: string) => {
    const checks = checksMap[jobId] || {}
    let passed = 0
    let failed = 0
    for (const item of QA_CHECKLIST) {
      if (checks[item.key] === 'pass') passed++
      else if (checks[item.key] === 'fail') failed++
    }
    return { passed, failed, total: QA_CHECKLIST.length }
  }, [checksMap])

  const handleAdvance = useCallback(async (jobId: string) => {
    if (!user?.canAdvance) return
    const { passed, total } = getJobProgress(jobId)
    if (passed < total) {
      if (!confirm(`Only ${passed}/${total} checks passed. Advance to Dispatch anyway?`)) return
    }
    try {
      await advanceJob(jobId)
      mutate()
    } catch (e) {
      console.error('Failed to advance:', e)
    }
  }, [user, getJobProgress, mutate])

  const openQaUpload = useCallback((jobId: string) => {
    setQaUploadJobId(jobId)
    setQaUploadFiles([])
    setQaUploadCaption('')
  }, [])

  const closeQaUpload = useCallback(() => {
    if (qaUploading) return
    setQaUploadJobId(null)
    setQaUploadFiles([])
    setQaUploadCaption('')
  }, [qaUploading])

  const handleQaFilesPicked = useCallback((list: FileList | null) => {
    if (!list) return
    const next = Array.from(list).filter((f) => f.type.startsWith('image/'))
    setQaUploadFiles((prev) => [...prev, ...next])
  }, [])

  const removeQaFile = useCallback((idx: number) => {
    setQaUploadFiles((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleQaSubmit = useCallback(async () => {
    if (!qaUploadJobId || qaUploadFiles.length === 0 || !user) return
    setQaUploading(true)
    try {
      for (const file of qaUploadFiles) {
        await uploadJobPhoto(
          qaUploadJobId,
          file,
          user.id || '',
          user.name || '',
          qaUploadCaption.trim(),
          'qa-final-report',
        )
      }
      await mutateFinalQa()
      setQaUploadJobId(null)
      setQaUploadFiles([])
      setQaUploadCaption('')
    } catch (e) {
      console.error('Failed to upload final QA photos:', e)
      alert('Failed to upload one or more photos. Please try again.')
    } finally {
      setQaUploading(false)
    }
  }, [qaUploadJobId, qaUploadFiles, qaUploadCaption, user, mutateFinalQa])

  const handleAddNote = useCallback(async (jobId: string) => {
    if (!noteText.trim() || !user) return
    setSubmitting(true)
    try {
      await createNote({
        jobId,
        authorId: user.id || '',
        authorName: user.name || '',
        type: 'holdup',
        message: noteText.trim(),
      })
      setNoteText('')
    } catch (e) {
      console.error('Failed to add note:', e)
    } finally {
      setSubmitting(false)
    }
  }, [noteText, user])

  const handlePrint = useCallback(() => {
    const rows = qcJobs.map((job: any) => {
      const { passed, failed, total } = getJobProgress(job.id)
      const checks = checksMap[job.id] || {}
      const checkCells = QA_CHECKLIST.map((item) => {
        const state = checks[item.key] || 'unchecked'
        const symbol = state === 'pass' ? '✔' : state === 'fail' ? '✘' : '—'
        const color = state === 'pass' ? '#0a7a3e' : state === 'fail' ? '#c33' : '#999'
        return `<td style="padding:4px 6px;text-align:center;font-weight:700;color:${color};">${symbol}</td>`
      }).join('')

      return `<tr>
        <td style="padding:5px 8px;font-weight:700;">${job.num}</td>
        <td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${job.type || ''}</td>
        <td style="padding:5px 8px;">${job.customer || '-'}</td>
        ${checkCells}
        <td style="padding:5px 8px;text-align:center;font-weight:700;">${passed}/${total}</td>
      </tr>`
    }).join('')

    const checkHeaders = QA_CHECKLIST.map((item) =>
      `<th style="padding:4px 4px;writing-mode:vertical-rl;text-orientation:mixed;white-space:nowrap;max-width:30px;font-size:8px;">${item.label}</th>`
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>YLZ QA Checklist — Print</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; color:#111; padding:16px; font-size:11px; }
    .header { display:flex; align-items:baseline; gap:12px; margin-bottom:4px; }
    .header h1 { font-size:22px; font-weight:900; letter-spacing:2px; }
    .header span { font-size:11px; color:#666; font-weight:600; letter-spacing:1px; text-transform:uppercase; }
    .meta { font-size:11px; color:#666; margin-bottom:16px; display:flex; gap:16px; }
    table { width:100%; border-collapse:collapse; font-size:10px; }
    thead th { background:#f3f3f3; font-size:8px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#555; padding:5px 8px; text-align:left; border-bottom:2px solid #ccc; white-space:nowrap; }
    tbody tr { border-bottom:1px solid #e0e0e0; }
    tbody tr:nth-child(even) { background:#f9f9f9; }
    @media print { body { padding:0; } @page { margin:10mm; size:landscape; } }
  </style>
</head>
<body>
  <div class="header"><h1>YLZ</h1><span>QA Checklist</span></div>
  <div class="meta">
    <span>Printed: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    <span>${qcJobs.length} job${qcJobs.length !== 1 ? 's' : ''} in QC</span>
  </div>
  <table>
    <thead><tr>
      <th>Job No.</th><th>Type</th><th>Customer</th>
      ${checkHeaders}
      <th style="text-align:center;">Score</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); w.onload = () => { w.print() } }
  }, [qcJobs, checksMap, getJobProgress])

  if (!jobs) {
    return <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>Loading QA data...</div>
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, lineHeight: 1 }}>
            QUALITY ASSURANCE
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, letterSpacing: 0.3 }}>
            QC inspection checklists &mdash; click a job to inspect
          </div>
        </div>
        <button
          onClick={handlePrint}
          style={{
            fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
            textTransform: 'uppercase', padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)',
            transition: '0.15s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
        >
          🖨 Print
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatCard label="In QC" value={qcJobs.length} color="#3b9de8" />
        <StatCard label="Coming Up" value={upcomingJobs.length} color="#f5a623" />
        <StatCard
          label="Fully Passed"
          value={qcJobs.filter((j: any) => getJobProgress(j.id).passed === QA_CHECKLIST.length).length}
          color="#22d07a"
        />
        <StatCard
          label="Has Failures"
          value={qcJobs.filter((j: any) => getJobProgress(j.id).failed > 0).length}
          color="#e84560"
        />
      </div>

      {/* QC Jobs Section */}
      <SectionHeader title="IN QC" count={qcJobs.length} color="#3b9de8" />
      {qcJobs.length === 0 ? (
        <EmptyState text="No jobs currently in QC stage." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {qcJobs.map((job: any) => {
            const isExpanded = expandedJob === job.id
            const { passed, failed, total } = getJobProgress(job.id)
            const checks = checksMap[job.id] || {}
            const allPassed = passed === total
            const holdups = holdupsByJob[job.id] || []
            const pct = Math.round((passed / total) * 100)

            return (
              <div key={job.id} style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                {/* Job Row */}
                <div
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer',
                    transition: 'background 0.12s', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--dark3)' }}
                  onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{isExpanded ? '▼' : '▶'}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 0.5, minWidth: 70 }}>{job.num}</span>
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 90 }}>{job.customer || '-'}</span>

                  {/* Progress Bar */}
                  <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3, transition: 'width 0.3s',
                        background: allPassed ? '#22d07a' : failed > 0 ? '#e84560' : '#3b9de8',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: allPassed ? '#22d07a' : '#fff', minWidth: 32 }}>{passed}/{total}</span>
                  </div>

                  {/* Status Badge */}
                  {allPassed ? (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 3, background: 'rgba(34,208,122,0.15)', color: '#22d07a', border: '1px solid rgba(34,208,122,0.3)' }}>
                      PASSED
                    </span>
                  ) : failed > 0 ? (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 3, background: 'rgba(232,69,96,0.15)', color: '#e84560', border: '1px solid rgba(232,69,96,0.3)' }}>
                      {failed} FAIL
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 3, background: 'rgba(255,255,255,0.06)', color: 'var(--text3)', border: '1px solid var(--border2)' }}>
                      PENDING
                    </span>
                  )}

                  {/* Final QA Badge — always visible */}
                  {(() => {
                    const qaCount = (finalQaByJob[job.id] || []).length
                    const submitted = qaCount > 0
                    return (
                      <span
                        title={submitted ? `Final QA submitted — ${qaCount} photo${qaCount !== 1 ? 's' : ''}` : 'Final QA not yet submitted'}
                        style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                          padding: '3px 10px', borderRadius: 3,
                          background: submitted ? 'rgba(34,208,122,0.15)' : 'rgba(255,255,255,0.04)',
                          color: submitted ? '#22d07a' : 'var(--text3)',
                          border: `1px solid ${submitted ? 'rgba(34,208,122,0.3)' : 'var(--border2)'}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {submitted ? `📎 FINAL QA ✓ ${qaCount}` : '📎 FINAL QA —'}
                      </span>
                    )
                  })()}

                  {holdups.length > 0 && (
                    <span style={{ fontSize: 10, color: '#e84560', fontWeight: 700 }} title={`${holdups.length} active holdup(s)`}>🚨</span>
                  )}
                </div>

                {/* Expanded Checklist */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                      {QA_CHECKLIST.map((item) => {
                        const state = checks[item.key] || 'unchecked'
                        const bg = state === 'pass' ? 'rgba(34,208,122,0.08)' : state === 'fail' ? 'rgba(232,69,96,0.08)' : 'transparent'
                        const border = state === 'pass' ? 'rgba(34,208,122,0.3)' : state === 'fail' ? 'rgba(232,69,96,0.3)' : 'var(--border)'
                        const icon = state === 'pass' ? '✅' : state === 'fail' ? '❌' : '⬜'
                        return (
                          <div
                            key={item.key}
                            onClick={(e) => { e.stopPropagation(); toggleCheck(job.id, item.key) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                              background: bg, border: `1px solid ${border}`, borderRadius: 4,
                              cursor: 'pointer', transition: '0.15s', userSelect: 'none',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = border }}
                          >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{item.label}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{item.desc}</div>
                            </div>
                            <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: state === 'pass' ? '#22d07a' : state === 'fail' ? '#e84560' : 'var(--text3)' }}>
                              {state === 'unchecked' ? 'Click to check' : state}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Quick Note */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input
                        type="text"
                        placeholder="Add a QA note or flag an issue..."
                        value={expandedJob === job.id ? noteText : ''}
                        onChange={(e) => setNoteText(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(job.id) }}
                        style={{
                          flex: 1, background: 'var(--dark3)', border: '1px solid var(--border)',
                          borderRadius: 4, color: '#fff', padding: '8px 12px', fontSize: 12, outline: 'none',
                          fontFamily: "'League Spartan', sans-serif",
                        }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddNote(job.id) }}
                        disabled={submitting || !noteText.trim()}
                        style={{
                          fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                          padding: '8px 14px', borderRadius: 4, cursor: submitting ? 'wait' : 'pointer',
                          border: '1px solid rgba(232,69,96,0.4)', background: 'rgba(232,69,96,0.1)',
                          color: '#e84560', transition: '0.15s', whiteSpace: 'nowrap',
                        }}
                      >
                        🚨 Flag Issue
                      </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', flex: 1 }}>
                        Click items to cycle: ⬜ Unchecked → ✅ Pass → ❌ Fail
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openQaUpload(job.id) }}
                        style={{
                          fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                          letterSpacing: 0.6, textTransform: 'uppercase', padding: '8px 18px',
                          borderRadius: 4, cursor: 'pointer', transition: '0.15s',
                          border: '1px solid rgba(232,104,26,0.5)',
                          background: 'rgba(232,104,26,0.12)',
                          color: '#E8681A',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(232,104,26,0.25)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(232,104,26,0.12)'
                        }}
                      >
                        📎 Final QA
                      </button>
                      {user?.canAdvance && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAdvance(job.id) }}
                          style={{
                            fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                            letterSpacing: 0.6, textTransform: 'uppercase', padding: '8px 18px',
                            borderRadius: 4, cursor: 'pointer', transition: '0.15s',
                            border: allPassed ? '1px solid rgba(34,208,122,0.5)' : '1px solid var(--border2)',
                            background: allPassed ? 'rgba(34,208,122,0.12)' : 'rgba(255,255,255,0.06)',
                            color: allPassed ? '#22d07a' : 'var(--text3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = allPassed ? 'rgba(34,208,122,0.25)' : 'rgba(255,255,255,0.1)'
                            e.currentTarget.style.color = allPassed ? '#22d07a' : '#fff'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = allPassed ? 'rgba(34,208,122,0.12)' : 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = allPassed ? '#22d07a' : 'var(--text3)'
                          }}
                        >
                          → Advance to Dispatch
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Final QA Upload Modal */}
      {qaUploadJobId && (() => {
        const job = qcJobs.find((j: any) => j.id === qaUploadJobId)
        const existingCount = (finalQaByJob[qaUploadJobId] || []).length
        return (
          <div
            onClick={closeQaUpload}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 8,
                width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                fontFamily: "'League Spartan', sans-serif",
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Final QA Report
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {job?.num} — {job?.type || 'Job'}{job?.customer ? ` / ${job.customer}` : ''}
                    {existingCount > 0 && (
                      <span style={{ marginLeft: 10, color: '#22d07a' }}>
                        · {existingCount} photo{existingCount !== 1 ? 's' : ''} already submitted
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeQaUpload}
                  disabled={qaUploading}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text3)', cursor: qaUploading ? 'wait' : 'pointer',
                    fontSize: 20, padding: 4, lineHeight: 1,
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                <label
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '24px 16px', border: '2px dashed var(--border2)', borderRadius: 6,
                    cursor: qaUploading ? 'wait' : 'pointer', background: 'rgba(255,255,255,0.02)',
                    transition: '0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,104,26,0.5)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)' }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={qaUploading}
                    onChange={(e) => { handleQaFilesPicked(e.target.files); e.target.value = '' }}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
                    📷 Tap to select photos
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Multi-select supported — JPG, PNG, HEIC
                  </div>
                </label>

                {qaUploadFiles.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>
                      Selected ({qaUploadFiles.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                      {qaUploadFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          style={{
                            position: 'relative', borderRadius: 4, overflow: 'hidden',
                            border: '1px solid var(--border)', background: 'var(--dark3)', aspectRatio: '1',
                          }}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            onClick={() => removeQaFile(idx)}
                            disabled={qaUploading}
                            title="Remove"
                            style={{
                              position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                              border: 'none', background: 'rgba(0,0,0,0.75)', color: '#fff', cursor: qaUploading ? 'wait' : 'pointer',
                              fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={qaUploadCaption}
                    onChange={(e) => setQaUploadCaption(e.target.value)}
                    disabled={qaUploading}
                    placeholder="Any comments to attach to this final QA report..."
                    rows={3}
                    style={{
                      width: '100%', background: 'var(--dark3)', border: '1px solid var(--border)',
                      borderRadius: 4, color: '#fff', padding: '8px 12px', fontSize: 12, outline: 'none',
                      fontFamily: "'League Spartan', sans-serif", resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={closeQaUpload}
                  disabled={qaUploading}
                  style={{
                    fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                    letterSpacing: 0.6, textTransform: 'uppercase', padding: '8px 18px',
                    borderRadius: 4, cursor: qaUploading ? 'wait' : 'pointer',
                    border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQaSubmit}
                  disabled={qaUploading || qaUploadFiles.length === 0}
                  style={{
                    fontFamily: "'League Spartan', sans-serif", fontSize: 11, fontWeight: 700,
                    letterSpacing: 0.6, textTransform: 'uppercase', padding: '8px 18px',
                    borderRadius: 4,
                    cursor: qaUploading ? 'wait' : qaUploadFiles.length === 0 ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: qaUploadFiles.length === 0 ? 'rgba(255,255,255,0.06)' : '#E8681A',
                    color: qaUploadFiles.length === 0 ? 'var(--text3)' : '#fff',
                    opacity: qaUploading ? 0.7 : 1,
                  }}
                >
                  {qaUploading ? 'Uploading…' : `Submit${qaUploadFiles.length > 0 ? ` (${qaUploadFiles.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Upcoming Jobs */}
      <SectionHeader title="COMING UP — FITOUT" count={upcomingJobs.length} color="#f5a623" />
      {upcomingJobs.length === 0 ? (
        <EmptyState text="No jobs currently in Fitout stage." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {upcomingJobs.map((job: any) => (
            <div
              key={job.id}
              style={{
                background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4,
                padding: '12px 14px', transition: '0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{job.num}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.type}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{job.customer || '-'}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: 'rgba(245,166,35,0.15)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)' }}>
                  Fitout
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Sub Components ──────────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4,
      padding: '12px 16px', minWidth: 110, flex: 1,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text2)' }}>{title}</span>
      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 8, background: `${color}22`, color, border: `1px solid ${color}44` }}>{count}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '24px 20px', color: 'var(--text3)', fontSize: 12, textAlign: 'center', background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 28 }}>
      {text}
    </div>
  )
}
