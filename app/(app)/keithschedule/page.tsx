'use client'

import { useState, useCallback, useMemo } from 'react'
import { useWorkers, useJobs, useMrpChecklists, addWorkerJob, updateWorkerJobs, deleteWorkerJob, syncFromSheets, markWorkerJobDone, saveWorkerJobMO } from '@/lib/hooks'
import { parseDate, fmtDate, addWorkdays, nextWorkday, compDate } from '@/lib/workdays'
import { useSession } from 'next-auth/react'
import { useSWRConfig } from 'swr'
import { useUndo } from '@/lib/undo-context'

/* ── Types ─────────────────────────────────────────────────────── */

interface WorkerJob {
  id: string
  workerId: string
  jobNo: string
  type: string
  start: string
  days: number
  position: number
  done?: boolean
  moNumber?: string
  completedAt?: string
}

interface Worker {
  id: string
  name: string
  role: string
  section: string
  color: string
  hdr: string
  jobs: WorkerJob[]
}

interface BoardJob {
  id: string
  num: string
  type: string
  stage: string
  customer: string
  btype: string
  dealer: string
}


/* ── Tab Definitions ───────────────────────────────────────────── */

const TABS = [
  { key: 'chassis', label: 'Truck Chassis' },
  { key: 'trailer_chassis', label: 'Trailer Chassis' },
  { key: 'alloy', label: 'Alloy Workers' },
  { key: 'hardox_steel', label: 'Hardox & Steel' },
  { key: 'paint', label: 'Paint' },
  { key: 'fitout', label: 'Fitout' },
  { key: 'trailer_subfit', label: 'Trailer & Subframe Fitout' },
] as const

type TabKey = (typeof TABS)[number]['key']

/* ── Filter helpers ────────────────────────────────────────────── */

function workersForTab(workers: Worker[], tab: TabKey): Worker[] {
  switch (tab) {
    case 'alloy':
      return workers.filter((w) => w.hdr === 'alloy')
    case 'hardox_steel':
      return workers.filter((w) => w.hdr === 'hardox' || w.hdr === 'steel')
    case 'chassis':
      return workers.filter((w) => w.hdr === 'chassis' && w.section === 'chassis')
    case 'trailer_chassis':
      return workers.filter((w) => w.section === 'trailer_chassis')
    case 'fitout':
      return workers.filter((w) => w.hdr === 'fitout' && w.section !== 'trailerfit')
    case 'paint':
      return workers.filter((w) => w.hdr === 'paint')
    case 'trailer_subfit':
      return workers.filter((w) => w.section === 'trailerfit' || w.section === 'subfit')
    default:
      return []
  }
}

/* ── Completion calculator ─────────────────────────────────────── */

function calcCompletion(jobs: WorkerJob[], idx: number): string {
  const job = jobs[idx]
  const startStr = job.start
  const days = job.days || 0

  if (startStr) {
    return compDate(startStr, days)
  }

  // Chain from previous job's completion
  if (idx > 0) {
    const prevComp = calcCompletion(jobs, idx - 1)
    if (prevComp) {
      const prevDate = parseDate(prevComp)
      if (prevDate) {
        const chainStart = nextWorkday(prevDate)
        return fmtDate(addWorkdays(chainStart, days))
      }
    }
  }

  return ''
}

/* ── Parts readiness helpers ───────────────────────────────────── */

function getSectionStatus(items: any[], sectionKey: string): 'ready' | 'ordered' | 'none' {
  const relevant = (items || []).filter((i: any) => i.section === sectionKey)
  if (!relevant.length) return 'none'
  if (relevant.every((i: any) => i.details?.picked)) return 'ready'
  if (relevant.some((i: any) => i.ordered)) return 'ordered'
  return 'none'
}

// Which parts section(s) to surface for each worker type
function partsIndicatorsForWorker(hdr: string, section: string): Array<{ key: string; label: string }> {
  if (hdr === 'hardox' || hdr === 'steel') return [{ key: 'coldform-kit', label: 'CF' }]
  if (section === 'subfit') return [{ key: 'pto', label: 'PTO' }]
  if (hdr === 'fitout' && section === 'fitout') return [{ key: 'tarp', label: 'TARP' }]
  return []
}

function PartsBadge({ label, status }: { label: string; status: 'ready' | 'ordered' | 'none' }) {
  if (status === 'none') return null
  const color = status === 'ready' ? '#22d07a' : '#f5a623'
  const icon = status === 'ready' ? '✓' : '~'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
      padding: '2px 5px', borderRadius: 3,
      background: `${color}20`, color, border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {icon} {label}
    </span>
  )
}

/* ── Main Component ────────────────────────────────────────────── */

export default function KeithSchedulePage() {
  useSession()
  const { data: workers = [], isLoading: wLoad } = useWorkers()
  const { data: jobs = [], isLoading: jLoad } = useJobs()
  const { mutate } = useSWRConfig()

  const { pushUndo } = useUndo()
  const [activeTab, setActiveTab] = useState<TabKey>('alloy')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  /* ── Jobs lookup map ───────────────────────────────── */
  const jobsMap = useMemo(() => {
    const m: Record<string, BoardJob> = {}
    if (Array.isArray(jobs)) {
      jobs.forEach((j: BoardJob) => {
        m[j.id] = j
        m[j.num] = j
      })
    }
    return m
  }, [jobs])

  /* ── Section scheduled set (jobNo → sections already containing it) ── */
  const sectionScheduled = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    const sectionOf = (w: Worker) => {
      if (w.section === 'trailerfit') return 'trailerfit'
      if (w.section === 'subfit') return 'subfit'
      return w.hdr
    }
    ;(workers as Worker[]).forEach((w) => {
      const sec = sectionOf(w)
      if (!map[sec]) map[sec] = new Set()
      w.jobs.forEach((wj) => { if (wj.jobNo) map[sec].add(wj.jobNo) })
    })
    return map
  }, [workers])

  /* ── Active board jobs (non-dispatched, non-sales) ─────────────── */
  const activeBoardJobs = useMemo(() => {
    if (!Array.isArray(jobs)) return [] as BoardJob[]
    return (jobs as BoardJob[]).filter(
      (j) => !['Dispatch', 'Requires Sales'].includes(j.stage)
    )
  }, [jobs])

  /* ── MRP checklist map: normalised jobNo → checklist ─────────── */
  const { data: checklists = [] } = useMrpChecklists()
  const checklistMap = useMemo(() => {
    const m: Record<string, any> = {}
    if (Array.isArray(checklists)) {
      checklists.forEach((c: any) => {
        const key = (c.jobNum || '').replace(/^YLZ\s*/i, '').trim()
        if (key) m[key] = c
      })
    }
    return m
  }, [checklists])

  /* ── Refresh shorthand ─────────────────────────────── */
  const refresh = useCallback(() => {
    mutate('/api/workers')
  }, [mutate])

  /* ── Handlers ──────────────────────────────────────── */

  const handleUpdateField = useCallback(
    async (worker: Worker, jobId: string, field: 'jobNo' | 'type' | 'start' | 'days', value: string | number) => {
      const updatedJobs = worker.jobs.map((j) => {
        if (j.id === jobId) {
          return {
            id: j.id,
            jobNo: field === 'jobNo' ? (value as string) : j.jobNo,
            type: field === 'type' ? (value as string) : j.type,
            start: field === 'start' ? (value as string) : j.start,
            days: field === 'days' ? Number(value) : j.days,
            position: j.position,
          }
        }
        return { id: j.id, jobNo: j.jobNo, type: j.type, start: j.start, days: j.days, position: j.position, done: j.done }
      })
      await updateWorkerJobs(worker.id, updatedJobs)
      refresh()
    },
    [refresh],
  )

  const handleAddRow = useCallback(
    async (workerId: string) => {
      await addWorkerJob(workerId, { jobNo: '', type: '', start: '', days: 1 })
      refresh()
    },
    [refresh],
  )

  const handleDeleteJob = useCallback(
    async (workerId: string, jobId: string) => {
      // Find the job data before deleting so we can undo
      const worker = (workers as Worker[]).find((w) => w.id === workerId)
      const deletedJob = worker?.jobs.find((j) => j.id === jobId)

      await deleteWorkerJob(workerId, jobId)
      refresh()

      if (deletedJob) {
        pushUndo({
          label: `Delete row ${deletedJob.jobNo || 'empty'}`,
          execute: async () => {
            await addWorkerJob(workerId, {
              jobNo: deletedJob.jobNo,
              type: deletedJob.type,
              start: deletedJob.start,
              days: deletedJob.days,
            })
            refresh()
          },
        })
      }
    },
    [refresh, workers, pushUndo],
  )

  const handleMarkComplete = useCallback(
    async (worker: Worker, jobId: string, done: boolean, moNumber: string) => {
      await markWorkerJobDone(worker.id, jobId, done, moNumber)
      refresh()
      mutate('/api/jobs')
    },
    [refresh, mutate],
  )

  const handleSaveMO = useCallback(
    async (workerId: string, jobId: string, moNumber: string) => {
      await saveWorkerJobMO(workerId, jobId, moNumber)
    },
    [],
  )

  const handleAddFromBoard = useCallback(
    async (workerId: string, jobNo: string, type: string) => {
      await addWorkerJob(workerId, { jobNo, type, start: '', days: 1 })
      refresh()
    },
    [refresh],
  )

  /* ── Sheet Sync handler ──────────────────────────── */
  const handleSheetSync = useCallback(async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const result = await syncFromSheets()
      if (result.hint === 'appsscript') {
        setSyncMsg('Open the Google Sheet → YLZ Sync → Push to App')
        setTimeout(() => setSyncMsg(''), 8000)
      } else if (result.message) {
        setSyncMsg(result.message)
        refresh()
      } else {
        const s = result.summary
        setSyncMsg(`Synced: ${s.created} new, ${s.updated} updated, ${s.deleted} removed`)
        refresh()
      }
    } catch (err: any) {
      setSyncMsg(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 8000)
    }
  }, [refresh])

  /* ── Print handler ────────────────────────────────── */

  const handlePrint = useCallback(() => {
    const currentTab = TABS.find((t) => t.key === activeTab)
    const tabLabel = currentTab?.label || activeTab

    let content = ''

    const tabWorkers = workersForTab(workers as Worker[], activeTab)
      content = tabWorkers.map((worker) => {
        const sortedJobs = [...worker.jobs].sort((a, b) => a.position - b.position)
        const rows = sortedJobs.map((job, idx) => {
          const completion = calcCompletion(sortedJobs, idx)
          const matched = jobsMap[job.jobNo]
          const stage = matched?.stage || ''
          return `<tr>
            <td style="padding:5px 10px;font-weight:600;">${job.jobNo || '-'}</td>
            <td style="padding:5px 10px;">${job.type || '-'}</td>
            <td style="padding:5px 10px;">${job.start || '-'}</td>
            <td style="padding:5px 10px;text-align:center;">${job.days}</td>
            <td style="padding:5px 10px;font-weight:600;">${completion || '-'}</td>
            <td style="padding:5px 10px;text-align:center;font-size:10px;text-transform:uppercase;font-weight:700;">${stage}</td>
          </tr>`
        }).join('')

        return `<div class="worker-card">
          <div class="worker-name">
            <span class="dot" style="background:${worker.color};"></span>
            ${worker.name} <span style="color:#888;font-weight:400;font-size:11px;margin-left:6px;">${worker.role}</span>
          </div>
          ${sortedJobs.length === 0
            ? '<p style="color:#999;font-size:11px;margin:8px 0;">No jobs in queue.</p>'
            : `<table>
              <thead><tr>
                <th>Job No.</th><th>Type</th><th>Start</th><th style="text-align:center;">Days</th><th>Completion</th><th style="text-align:center;">Stage</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`
          }
        </div>`
      }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>YLZ Keith's Schedule — ${tabLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 20px; }
    .header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
    .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
    .header span { font-size: 11px; color: #666; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .meta { font-size: 11px; color: #666; margin-bottom: 20px; display: flex; gap: 16px; }
    .worker-card { border: 1px solid #ddd; border-radius: 4px; padding: 12px 14px; margin-bottom: 14px; page-break-inside: avoid; }
    .worker-name { font-size: 14px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { background: #f3f3f3; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #555; padding: 6px 10px; text-align: left; border-bottom: 2px solid #ccc; white-space: nowrap; }
    tbody tr { border-bottom: 1px solid #e5e5e5; }
    .pill { font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; }
    .pill-arrived { background: #d4f5e4; color: #0a7a3e; }
    .pill-ordered { background: #d4e8f5; color: #1a6db0; }
    .pill-pending { background: #fef3d4; color: #b07a1a; }
    .pill-na { background: #eee; color: #999; }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>YLZ</h1>
    <span>Keith's Schedule — ${tabLabel}</span>
  </div>
  <div class="meta">
    <span>Printed: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  ${content}
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => { printWindow.print() }
    }
  }, [activeTab, workers, jobsMap])

  /* ── Loading state ─────────────────────────────────── */

  if (wLoad || jLoad) {
    return (
      <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>
        Loading schedule data...
      </div>
    )
  }

  /* ── Filtered workers for active tab ───────────────── */
  const filtered = workersForTab(workers as Worker[], activeTab)

  /* ── Render ────────────────────────────────────────── */

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#fff',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            KEITH&apos;S SCHEDULE
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0 0' }}>
            Worker job queues and scheduling
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {syncMsg && (
            <span style={{ fontSize: 11, color: syncMsg.includes('failed') ? '#e84560' : '#22d07a', marginRight: 4 }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSheetSync}
            disabled={syncing}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: syncing ? 'wait' : 'pointer',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: syncing ? 'var(--text3)' : 'var(--text2)',
              transition: '0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              opacity: syncing ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!syncing) {
                e.currentTarget.style.borderColor = '#22d07a'
                e.currentTarget.style.color = '#22d07a'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = syncing ? 'var(--text3)' : 'var(--text2)'
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Sheet'}
          </button>
          <button
            onClick={handlePrint}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              transition: '0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border2)'
              e.currentTarget.style.color = 'var(--text2)'
            }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Tab Row */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          whiteSpace: 'nowrap',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                padding: '8px 16px',
                borderRadius: 3,
                border: isActive ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid var(--border2)',
                background: isActive ? 'var(--btn-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text2)',
                cursor: 'pointer',
                transition: '0.15s',
                flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <>
        {filtered.length === 0 ? (
            <div style={{ padding: 30, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
              No workers assigned to this section.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((worker) => {
                return (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    jobsMap={jobsMap}
                    boardJobs={activeBoardJobs}
                    checklistMap={checklistMap}
                    onUpdateField={handleUpdateField}
                    onAddRow={handleAddRow}
                    onDeleteJob={handleDeleteJob}
                    onMarkComplete={handleMarkComplete}
                    onSaveMO={handleSaveMO}
                    onAddFromBoard={handleAddFromBoard}
                  />
                )
              })}
            </div>
          )}
      </>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Worker Card
   ══════════════════════════════════════════════════════════════ */

function normaliseNum(num: string) {
  return num.replace(/^YLZ\s*/i, '').trim()
}

function WorkerCard({
  worker,
  jobsMap,
  boardJobs,
  checklistMap,
  onUpdateField,
  onAddRow,
  onDeleteJob,
  onMarkComplete,
  onSaveMO,
  onAddFromBoard,
}: {
  worker: Worker
  jobsMap: Record<string, BoardJob>
  boardJobs: BoardJob[]
  checklistMap: Record<string, any>
  onUpdateField: (worker: Worker, jobId: string, field: 'jobNo' | 'type' | 'start' | 'days', value: string | number) => void
  onAddRow: (workerId: string) => void
  onDeleteJob: (workerId: string, jobId: string) => void
  onMarkComplete: (worker: Worker, jobId: string, done: boolean, moNumber: string) => void
  onSaveMO: (workerId: string, jobId: string, moNumber: string) => void
  onAddFromBoard: (workerId: string, jobNo: string, type: string) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const sortedJobs = [...worker.jobs].sort((a, b) => a.position - b.position)

  // Jobs available to add: active, relevant to section, not already in this section
  const workerJobNums = new Set(worker.jobs.map((j) => j.jobNo))
  const availableJobs = boardJobs.filter((bj) => {
    const n = normaliseNum(bj.num)
    if (workerJobNums.has(n)) return false
    const q = search.toLowerCase()
    if (q && !bj.num.toLowerCase().includes(q) && !bj.type.toLowerCase().includes(q) && !bj.customer.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '14px 16px',
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: worker.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{worker.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{worker.role}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => { setShowPicker((v) => !v); setSearch('') }}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 3,
              border: showPicker ? '1px solid #E8681A' : '1px solid var(--border2)',
              background: showPicker ? 'rgba(232,104,26,0.12)' : 'transparent',
              color: showPicker ? '#E8681A' : 'var(--text3)',
              cursor: 'pointer',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            + Add from Job Board
          </button>
        </div>
      </div>

      {/* Job Picker */}
      {showPicker && (
        <div style={{
          background: 'var(--dark3)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          marginBottom: 12,
          padding: '10px 12px',
        }}>
          <input
            type="text"
            placeholder="Search job number, type or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: '#fff',
              borderRadius: 3,
              padding: '6px 10px',
              fontSize: 11,
              fontFamily: "'League Spartan', sans-serif",
              outline: 'none',
              marginBottom: 8,
            }}
            autoFocus
          />
          {availableJobs.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>
              {search ? 'No matches' : 'All jobs already scheduled for this section'}
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {availableJobs.slice(0, 30).map((bj) => (
                <div
                  key={bj.id}
                  onClick={() => {
                    onAddFromBoard(worker.id, normaliseNum(bj.num), bj.type)
                    setShowPicker(false)
                    setSearch('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(232,104,26,0.1)'
                    e.currentTarget.style.borderColor = '#E8681A44'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#E8681A', fontSize: 11, minWidth: 70 }}>{bj.num}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 11, flex: 1 }}>{bj.type}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 10 }}>{bj.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Queue Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border2)', textAlign: 'left' }}>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 110 }}>Status</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 80 }}>Job No.</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Type</th>
            {partsIndicatorsForWorker(worker.hdr, worker.section).length > 0 && (
              <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 70 }}>Parts</th>
            )}
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 90 }}>MO No.</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 90 }}>Start Date</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 50 }}>Days</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 90 }}>Completion</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 40, textAlign: 'center' }}>Del</th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job, idx) => {
            const completion = calcCompletion(sortedJobs, idx)
            const isDone = !!job.done
            const rowStyle: React.CSSProperties = {
              borderBottom: '1px solid var(--border)',
              opacity: isDone ? 0.5 : 1,
            }
            const textStyle: React.CSSProperties = isDone
              ? { textDecoration: 'line-through', color: 'var(--text3)' }
              : {}
            const indicators = partsIndicatorsForWorker(worker.hdr, worker.section)
            const checklist = checklistMap[job.jobNo]
            return (
              <tr key={job.id} style={rowStyle}>
                {/* Status dropdown */}
                <td style={{ padding: 6 }}>
                  <select
                    value={isDone ? 'complete' : 'inprogress'}
                    onChange={(e) => {
                      const newDone = e.target.value === 'complete'
                      const moEl = document.getElementById(`mo-${job.id}`) as HTMLInputElement | null
                      const mo = moEl?.value ?? job.moNumber ?? ''
                      onMarkComplete(worker, job.id, newDone, mo)
                    }}
                    style={{
                      background: isDone ? 'rgba(34,208,122,0.12)' : 'var(--dark3)',
                      border: `1px solid ${isDone ? '#22d07a' : 'var(--border)'}`,
                      color: isDone ? '#22d07a' : 'var(--text2)',
                      borderRadius: 3,
                      padding: '4px 6px',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'League Spartan', sans-serif",
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      width: 100,
                      outline: 'none',
                    }}
                  >
                    <option value="inprogress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                </td>
                <td style={{ padding: 6 }}>
                  <input
                    type="text"
                    defaultValue={job.jobNo}
                    placeholder="YLZ..."
                    onBlur={(e) => {
                      if (e.target.value !== job.jobNo) {
                        onUpdateField(worker, job.id, 'jobNo', e.target.value)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    style={{
                      background: 'var(--dark3)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: 11,
                      width: 80,
                      borderRadius: 2,
                      outline: 'none',
                      fontFamily: "'League Spartan', sans-serif",
                      fontWeight: 600,
                      ...textStyle,
                    }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <input
                    type="text"
                    defaultValue={job.type}
                    placeholder="Type..."
                    onBlur={(e) => {
                      if (e.target.value !== job.type) {
                        onUpdateField(worker, job.id, 'type', e.target.value)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    style={{
                      background: 'var(--dark3)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: 11,
                      width: '100%',
                      borderRadius: 2,
                      outline: 'none',
                      fontFamily: "'League Spartan', sans-serif",
                      ...textStyle,
                    }}
                  />
                </td>
                {indicators.length > 0 && (
                  <td style={{ padding: '6px 4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {indicators.map(({ key, label }) => (
                        <PartsBadge
                          key={key}
                          label={label}
                          status={checklist ? getSectionStatus(checklist.items, key) : 'none'}
                        />
                      ))}
                    </div>
                  </td>
                )}
                {/* MO Number */}
                <td style={{ padding: 6 }}>
                  <input
                    id={`mo-${job.id}`}
                    type="text"
                    defaultValue={job.moNumber ?? ''}
                    placeholder="MO-..."
                    onBlur={(e) => {
                      if (e.target.value !== (job.moNumber ?? '')) {
                        onSaveMO(worker.id, job.id, e.target.value)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    style={{
                      background: 'var(--dark3)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      padding: '4px 6px',
                      fontSize: 10,
                      width: 80,
                      borderRadius: 2,
                      outline: 'none',
                      fontFamily: 'monospace',
                      ...textStyle,
                    }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <input
                    type="text"
                    defaultValue={job.start}
                    placeholder="dd/mm/yy"
                    onBlur={(e) => {
                      if (e.target.value !== job.start) {
                        onUpdateField(worker, job.id, 'start', e.target.value)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    style={{
                      background: 'var(--dark3)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: 11,
                      width: 80,
                      borderRadius: 2,
                      outline: 'none',
                      fontFamily: "'League Spartan', sans-serif",
                    }}
                  />
                </td>
                <td style={{ padding: 6 }}>
                  <input
                    type="number"
                    defaultValue={job.days}
                    min={0}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val) && val !== job.days) {
                        onUpdateField(worker, job.id, 'days', val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    style={{
                      background: 'var(--dark3)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: 11,
                      width: 50,
                      borderRadius: 2,
                      outline: 'none',
                      fontFamily: "'League Spartan', sans-serif",
                    }}
                  />
                </td>
                <td style={{ padding: 6, color: completion ? 'var(--green)' : 'var(--text3)' }}>
                  {completion || '-'}
                </td>
                <td style={{ padding: 6, textAlign: 'center' }}>
                  <button
                    onClick={() => onDeleteJob(worker.id, job.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1,
                      padding: '2px 6px',
                      borderRadius: 2,
                      transition: '0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(232,69,96,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                    }}
                    title="Delete job"
                  >
                    X
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Add Row Button */}
      <button
        onClick={() => onAddRow(worker.id)}
        style={{
          marginTop: 10,
          background: 'none',
          border: '1px dashed var(--border2)',
          color: 'var(--text3)',
          padding: '6px 14px',
          fontSize: 11,
          fontWeight: 600,
          borderRadius: 3,
          cursor: 'pointer',
          transition: '0.15s',
          fontFamily: "'League Spartan', sans-serif",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#fff'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border2)'
          e.currentTarget.style.color = 'var(--text3)'
        }}
      >
        + Add Row (Manual)
      </button>

      {/* Snapshot Panel */}
      <div
        style={{
          marginTop: 14,
          background: 'var(--dark3)',
          borderTop: '1px solid var(--border)',
          padding: 12,
          borderRadius: '0 0 4px 4px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: 'var(--text3)',
            marginBottom: 8,
          }}
        >
          Snapshot &mdash; Live Stage Sync
        </div>
        {sortedJobs.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>No jobs in queue.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sortedJobs.map((wj) => {
              const matched = jobsMap[wj.jobNo]
              const stage = matched?.stage || 'N/A'
              const stageColor =
                stage === 'Fab'
                  ? 'var(--red)'
                  : stage === 'Paint' || stage === 'Fitout' || stage === 'QC'
                    ? 'var(--accent)'
                    : stage === 'Dispatch'
                      ? 'var(--green)'
                      : 'var(--text3)'
              return (
                <div
                  key={wj.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    background: 'rgba(255,255,255,0.03)',
                    padding: '4px 10px',
                    borderRadius: 3,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{wj.jobNo || '???'}</span>
                  <span
                    style={{
                      color: stageColor,
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {stage}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

