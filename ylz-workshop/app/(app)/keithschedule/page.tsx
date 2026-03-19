'use client'

import { useState, useCallback, useMemo } from 'react'
import { useWorkers, useJobs, useTarps, addWorkerJob, updateWorkerJobs, deleteWorkerJob, syncFromSheets } from '@/lib/hooks'
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

interface Job {
  id: string
  num: string
  type: string
  stage: string
  customer: string
}

interface Tarp {
  id: string
  jobNo: string
  type: string
  susp: string
  tyres: string
  tarp: string
}

/* ── Tab Definitions ───────────────────────────────────────────── */

const TABS = [
  { key: 'alloy', label: 'Alloy Workers' },
  { key: 'hardox_steel', label: 'Hardox & Steel' },
  { key: 'chassis', label: 'Chassis' },
  { key: 'fitout_paint', label: 'Fitout & Paint' },
  { key: 'trailerfit', label: 'Trailer Chassis Fitout' },
  { key: 'subfit', label: 'Subframe Fitout' },
  { key: 'tarps', label: 'Tarps & Suspension' },
  { key: 'completed', label: 'Completed Orders' },
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
      return workers.filter((w) => w.hdr === 'chassis')
    case 'fitout_paint':
      return workers.filter((w) => w.hdr === 'fitout' || w.hdr === 'paint')
    case 'trailerfit':
      return workers.filter((w) => w.section === 'trailerfit')
    case 'subfit':
      return workers.filter((w) => w.section === 'subfit')
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

/* ── Status pill colors ────────────────────────────────────────── */

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'arrived':
      return { bg: 'rgba(34,208,122,0.15)', text: '#22d07a' }
    case 'ordered':
      return { bg: 'rgba(59,157,232,0.15)', text: '#3b9de8' }
    case 'pending':
      return { bg: 'rgba(245,166,35,0.15)', text: '#f5a623' }
    case 'na':
      return { bg: 'rgba(255,255,255,0.06)', text: '#787878' }
    default:
      return { bg: 'rgba(255,255,255,0.06)', text: '#787878' }
  }
}

/* ── Main Component ────────────────────────────────────────────── */

export default function KeithSchedulePage() {
  useSession()
  const { data: workers = [], isLoading: wLoad } = useWorkers()
  const { data: jobs = [], isLoading: jLoad } = useJobs()
  const { data: tarps = [], isLoading: tLoad } = useTarps()
  const { mutate } = useSWRConfig()

  const { pushUndo } = useUndo()
  const [activeTab, setActiveTab] = useState<TabKey>('alloy')
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  /* ── Jobs lookup map ───────────────────────────────── */
  const jobsMap = useMemo(() => {
    const m: Record<string, Job> = {}
    if (Array.isArray(jobs)) {
      jobs.forEach((j: Job) => {
        m[j.id] = j
        m[j.num] = j
      })
    }
    return m
  }, [jobs])

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
        return { id: j.id, jobNo: j.jobNo, type: j.type, start: j.start, days: j.days, position: j.position }
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

    if (activeTab === 'tarps') {
      // Print tarps table
      const rows = (tarps as Tarp[]).map((t) => `<tr>
        <td style="padding:6px 10px;font-weight:600;">${t.jobNo}</td>
        <td style="padding:6px 10px;">${t.type || '-'}</td>
        <td style="padding:6px 10px;text-align:center;"><span class="pill pill-${t.susp}">${t.susp}</span></td>
        <td style="padding:6px 10px;text-align:center;"><span class="pill pill-${t.tyres}">${t.tyres}</span></td>
        <td style="padding:6px 10px;text-align:center;"><span class="pill pill-${t.tarp}">${t.tarp}</span></td>
      </tr>`).join('')
      content = `<table>
        <thead><tr>
          <th>Job No</th><th>Type</th><th style="text-align:center;">Suspension</th><th style="text-align:center;">Tyres</th><th style="text-align:center;">Tarp</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    } else if (activeTab === 'completed') {
      content = `<p style="color:#666;font-size:12px;">Completed orders — see app for full data.</p>`
    } else {
      // Print worker cards for active tab
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
    }

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
  }, [activeTab, workers, tarps, jobsMap])

  /* ── Loading state ─────────────────────────────────── */

  if (wLoad || jLoad || tLoad) {
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
      {activeTab === 'tarps' ? (
        <TarpsTab tarps={tarps as Tarp[]} />
      ) : activeTab === 'completed' ? (
        <CompletedTab />
      ) : (
        <>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
              No workers assigned to this section.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  jobsMap={jobsMap}
                  onUpdateField={handleUpdateField}
                  onAddRow={handleAddRow}
                  onDeleteJob={handleDeleteJob}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Worker Card
   ══════════════════════════════════════════════════════════════ */

function WorkerCard({
  worker,
  jobsMap,
  onUpdateField,
  onAddRow,
  onDeleteJob,
}: {
  worker: Worker
  jobsMap: Record<string, Job>
  onUpdateField: (worker: Worker, jobId: string, field: 'jobNo' | 'type' | 'start' | 'days', value: string | number) => void
  onAddRow: (workerId: string) => void
  onDeleteJob: (workerId: string, jobId: string) => void
}) {
  const sortedJobs = [...worker.jobs].sort((a, b) => a.position - b.position)

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
      </div>

      {/* Job Queue Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border2)',
              textAlign: 'left',
            }}
          >
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 90 }}>Job No.</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Type</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 100 }}>Start Date</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 60 }}>Days</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 100 }}>Completion</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, width: 50, textAlign: 'center' }}>
              Delete
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job, idx) => {
            const completion = calcCompletion(sortedJobs, idx)
            return (
              <tr key={job.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
        + Add Row
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

/* ══════════════════════════════════════════════════════════════════
   Tarps & Suspension Tab
   ══════════════════════════════════════════════════════════════ */

function TarpsTab({ tarps }: { tarps: Tarp[] }) {
  if (!tarps || tarps.length === 0) {
    return (
      <div style={{ padding: 30, color: 'var(--text3)', fontSize: 13, textAlign: 'center' }}>
        No tarps data available.
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '14px 16px',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border2)', textAlign: 'left' }}>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Job No</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Type</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>
              Suspension
            </th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Tyres</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600, textAlign: 'center' }}>Tarp</th>
          </tr>
        </thead>
        <tbody>
          {tarps.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: 6, color: 'var(--text2)', fontWeight: 600 }}>{t.jobNo}</td>
              <td style={{ padding: 6, color: 'var(--text2)' }}>{t.type || '-'}</td>
              <td style={{ padding: 6, textAlign: 'center' }}>
                <StatusPill status={t.susp} />
              </td>
              <td style={{ padding: 6, textAlign: 'center' }}>
                <StatusPill status={t.tyres} />
              </td>
              <td style={{ padding: 6, textAlign: 'center' }}>
                <StatusPill status={t.tarp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Status Pill ───────────────────────────────────────────────── */

function StatusPill({ status }: { status: string }) {
  const { bg, text } = statusColor(status)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        background: bg,
        color: text,
      }}
    >
      {status}
    </span>
  )
}

/* ══════════════════════════════════════════════════════════════════
   Completed Orders Tab
   ══════════════════════════════════════════════════════════════ */

function CompletedTab() {
  const placeholderData = [
    { id: '1', jobNo: 'J-0340', name: 'Hardox Tipper Body', fab: '12/01/26', paint: '19/01/26', fitout: '26/01/26', date: '02/02/26' },
    { id: '2', jobNo: 'J-0341', name: 'Alloy Tray Body', fab: '05/01/26', paint: '12/01/26', fitout: '20/01/26', date: '27/01/26' },
    { id: '3', jobNo: 'J-0342', name: 'Flat Tray Trailer', fab: '08/01/26', paint: '15/01/26', fitout: '22/01/26', date: '30/01/26' },
  ]

  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '14px 16px',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border2)', textAlign: 'left' }}>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Job No</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Name</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Fab</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Paint</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Fitout</th>
            <th style={{ padding: 6, color: 'var(--text3)', fontWeight: 600 }}>Completed</th>
          </tr>
        </thead>
        <tbody>
          {placeholderData.map((order) => (
            <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: 6, color: 'var(--text2)', fontWeight: 600 }}>{order.jobNo}</td>
              <td style={{ padding: 6, color: 'var(--text2)' }}>{order.name}</td>
              <td style={{ padding: 6, color: 'var(--text3)' }}>{order.fab}</td>
              <td style={{ padding: 6, color: 'var(--text3)' }}>{order.paint}</td>
              <td style={{ padding: 6, color: 'var(--text3)' }}>{order.fitout}</td>
              <td style={{ padding: 6, color: 'var(--green)', fontWeight: 600 }}>{order.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
