'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { deriveBtype } from '@/lib/jobTypes'

// ── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string
  num: string
  type: string
  btype: string
  customer: string
  stage: string
  prodGroup: string
  due: string
}

interface ChecklistItem {
  id: string
  section: string
  label: string
  details: Record<string, unknown>
  notes: string
  ordered: boolean
  orderedBy: string
  orderedAt: string | null
}

interface Checklist {
  id: string
  jobId: string
  jobNum: string
  customer: string
  status: string
  items: ChecklistItem[]
}

interface BomEntry {
  code: string
  name: string
  category?: string
  section?: string
  note?: string
}

interface ColdformKit {
  id: string
  size: string
  walls: string
  tunnel: string
  floor: string
  headBoard: string
  tailGate: string
  splashGuards: string
  lightStrips: string
  allocatedTo: string
  status: string
}

// ── Status: waiting → ordered → ready → picked ────────────────────────────────

type PartStatus = 'waiting' | 'ordered' | 'ready' | 'picked'

function getStatus(item: ChecklistItem): PartStatus {
  const d = item.details as Record<string, unknown>
  if (d?.picked === true) return 'picked'
  if (d?.ready === true) return 'ready'
  if (item.ordered) return 'ordered'
  return 'waiting'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const C = {
  copper: '#E8681A',
  bg: '#0a0a0a',
  panel: '#111111',
  card: '#181818',
  border: 'rgba(255,255,255,0.08)',
  text1: '#ffffff',
  text2: 'rgba(255,255,255,0.6)',
  text3: 'rgba(255,255,255,0.3)',
  green: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#a78bfa',
  teal: '#06b6d4',
  font: "'League Spartan', system-ui, sans-serif",
  mono: "'Courier New', monospace",
}

const STATUS_STYLE: Record<PartStatus, { bg: string; border: string; color: string; label: string; dot: string }> = {
  waiting: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)',  color: C.text3,  label: 'Waiting',          dot: 'rgba(255,255,255,0.2)' },
  ordered: { bg: 'rgba(232,104,26,0.10)',  border: 'rgba(232,104,26,0.4)',  color: C.copper, label: 'Ordered',           dot: C.copper },
  ready:   { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.4)',   color: C.teal,   label: 'Ready for Pickup',  dot: C.teal   },
  picked:  { bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.4)', color: C.green,  label: 'Picked',            dot: C.green  },
}

const KIT_PARTS = ['walls', 'tunnel', 'floor', 'headBoard', 'tailGate', 'splashGuards', 'lightStrips'] as const

const SECTION_META: Record<string, { icon: string; title: string; short: string }> = {
  'mrp-entry':    { icon: '📦', title: 'MRP Entry',         short: 'MRP'        },
  'tarp':         { icon: '🧵', title: 'Tarp System',       short: 'Tarp'       },
  'pto':          { icon: '⚙️', title: 'PTO',              short: 'PTO'        },
  'hoist':        { icon: '🔩', title: 'Hoist & Hyd.',     short: 'Hoist'      },
  'axles':        { icon: '🚛', title: 'Axles & Susp.',    short: 'Axles'      },
  'tube-cut':     { icon: '✂️', title: 'Tube Cutter',      short: 'Tube Cut'   },
  'laser-cut':    { icon: '🔥', title: 'Laser Cutter',     short: 'Laser Cut'  },
  'coldform-kit': { icon: '🏭', title: 'Cold Form Kit',    short: 'ColdForm'   },
  'wheels-tyres': { icon: '🛞', title: 'Wheels & Tyres',   short: 'Wheels'     },
  'ebs-kit':      { icon: '🔴', title: 'EBS Kit',          short: 'EBS'        },
  'ballrace':     { icon: '⭕', title: 'Ball Race',         short: 'Ball Race'  },
  'tow-eye':      { icon: '🔗', title: 'Tow Eye',          short: 'Tow Eye'    },
  'extras':       { icon: '➕', title: 'Extras',           short: 'Extras'     },
  'other':        { icon: '📋', title: 'Other Parts',      short: 'Other'      },
}

function getSectionsForBtype(btype: string): string[] {
  switch (btype) {
    case 'hardox-body':    return ['mrp-entry', 'tarp', 'hoist', 'pto', 'tube-cut', 'laser-cut', 'coldform-kit']
    case 'hardox-trailer': return ['mrp-entry', 'tarp', 'hoist', 'pto', 'tube-cut', 'laser-cut', 'coldform-kit', 'axles', 'wheels-tyres', 'ebs-kit', 'ballrace', 'tow-eye', 'extras']
    case 'ally-body':      return ['mrp-entry', 'tarp', 'hoist', 'pto', 'tube-cut', 'laser-cut']
    case 'ally-trailer':   return ['mrp-entry', 'tarp', 'hoist', 'pto', 'tube-cut', 'laser-cut', 'axles', 'wheels-tyres', 'ebs-kit', 'ballrace', 'tow-eye', 'extras']
    case 'beavertail':     return ['mrp-entry', 'tarp', 'hoist', 'tube-cut', 'laser-cut', 'axles', 'wheels-tyres', 'ebs-kit', 'extras']
    case 'flat-tray':      return ['mrp-entry', 'tarp', 'tube-cut', 'laser-cut']
    case 'dolly':          return ['mrp-entry', 'tube-cut', 'axles', 'wheels-tyres', 'ebs-kit', 'ballrace', 'tow-eye', 'extras']
    case 'dropside':       return ['mrp-entry', 'tarp', 'hoist', 'tube-cut', 'laser-cut']
    default:               return ['mrp-entry', 'tarp', 'hoist', 'tube-cut', 'laser-cut', 'other']
  }
}

function kitProgress(kit: ColdformKit) {
  const done = KIT_PARTS.filter(k => { const v = (kit[k] || '').toLowerCase().trim(); return v === 'y' || v === 'yes' }).length
  return { done, total: KIT_PARTS.length }
}

// ── Print helpers ─────────────────────────────────────────────────────────────

function printBom(jobNum: string, customer: string, jobType: string, bomList: BomEntry[]) {
  const html = `<!DOCTYPE html><html><head><title>BOM — ${jobNum}</title>
<style>body{font-family:'Courier New',monospace;font-size:12px;margin:24px}h2{font-size:16px;margin:0 0 4px}.sub{font-size:11px;color:#555;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{text-align:left;border-bottom:2px solid #000;padding:4px 8px 6px;font-size:11px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #ddd}tr:nth-child(even) td{background:#f7f7f7}.code{font-weight:700}</style>
</head><body>
<h2>BOM — ${jobNum}</h2>
<div class="sub">${customer} | ${jobType} | Printed ${new Date().toLocaleDateString('en-AU')}</div>
<table><thead><tr><th>#</th><th>Code</th><th>Name</th><th>Section</th></tr></thead><tbody>
${bomList.map((b, i) => `<tr><td>${i + 1}</td><td class="code">${b.code}</td><td>${b.name}${b.note ? ` (${b.note})` : ''}</td><td>${b.section || b.category || ''}</td></tr>`).join('')}
</tbody></table></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

interface RunSheetJob {
  num: string; customer: string; type: string; due: string
  readyItems: string[]
}

function printRunSheet(jobs: RunSheetJob[]) {
  const rows = jobs.map(j => `
    <tr class="job-row">
      <td class="num">${j.num}</td>
      <td>${j.customer || '—'}</td>
      <td>${j.type}</td>
      <td>${j.due || '—'}</td>
      <td>${j.readyItems.join(', ')}</td>
      <td class="check"></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><title>Parts Run Sheet — Gary</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;margin:28px;color:#000}
  h1{font-size:22px;margin:0 0 4px}
  .sub{font-size:12px;color:#555;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#222;color:#fff;text-align:left;padding:8px 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:10px 10px;border-bottom:1px solid #ddd;vertical-align:top}
  .job-row:nth-child(even) td{background:#f9f9f9}
  .num{font-weight:700;font-family:'Courier New',monospace;white-space:nowrap}
  .check{width:40px;border:2px solid #999;border-radius:4px;height:28px}
  .sig{margin-top:40px;border-top:1px solid #999;padding-top:16px;display:flex;gap:80px}
  .sig-field{flex:1}
  .sig-line{border-bottom:1px solid #333;height:36px;margin-bottom:6px}
  .sig-label{font-size:11px;color:#555}
  @media print{body{margin:14px}}
</style>
</head><body>
<h1>Parts Run Sheet</h1>
<div class="sub">Driver: Gary &nbsp;|&nbsp; Date: ${new Date().toLocaleDateString('en-AU')} &nbsp;|&nbsp; ${jobs.length} job${jobs.length !== 1 ? 's' : ''} ready for pickup</div>
<table>
  <thead><tr><th>Job #</th><th>Customer</th><th>Body / Type</th><th>Due Date</th><th>Parts to Pick Up</th><th>Done</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="sig">
  <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Driver signature</div></div>
  <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Collected by (print name)</div></div>
  <div class="sig-field"><div class="sig-line"></div><div class="sig-label">Time out</div></div>
</div>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 400)
}

// ── Parts info from quote config ──────────────────────────────────────────────

interface TarpInfo {
  system: string; colour: string; length: string; bow: string; manual: boolean; electric: boolean
}
interface HoistInfo { type: string; hydTank: string; hydraulics: string; controls: string; pivot: string }
interface PtoInfo   { type: string; chassis: string }
interface AxlesInfo { make: string; count: string; type: string; suspension: string; studPattern: string; axleLift: string }
interface PartsInfo { tarp?: TarpInfo | null; hoist?: HoistInfo | null; pto?: PtoInfo | null; axles?: AxlesInfo | null }

// ── Main component ────────────────────────────────────────────────────────────

export default function PartsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [checklists, setChecklists] = useState<Record<string, Checklist>>({})
  const [bomLists, setBomLists] = useState<Record<string, BomEntry[] | null>>({})
  const [partsInfos, setPartsInfos] = useState<Record<string, PartsInfo>>({})
  const [coldformKits, setColdformKits] = useState<ColdformKit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'parts' | 'runsheet'>('parts')
  const [filter, setFilter] = useState<'all' | 'waiting' | 'in-progress' | 'ready' | 'picked'>('all')
  const [search, setSearch] = useState('')
  const creatingRef = useRef<Set<string>>(new Set())
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [jobsRes, clRes, kitsRes] = await Promise.all([
        fetch('/api/jobs').then(r => r.json()),
        fetch('/api/mrp-checklist').then(r => r.json()),
        fetch('/api/coldform/kits').then(r => r.json()),
      ])
      const allJobs: Job[] = (Array.isArray(jobsRes) ? jobsRes : [])
        .filter((j: Job) => j.prodGroup !== 'finished' && !j.stage?.includes('Dispatch'))
        .map((j: Job) => ({ ...j, btype: j.btype || deriveBtype(j.type || '') }))
      const clMap: Record<string, Checklist> = {}
      if (Array.isArray(clRes)) clRes.forEach((cl: Checklist) => { clMap[cl.jobId] = cl })
      setJobs(allJobs)
      setChecklists(clMap)
      setColdformKits(Array.isArray(kitsRes) ? kitsRes : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const ensureChecklist = useCallback(async (job: Job) => {
    if (checklists[job.id] || creatingRef.current.has(job.id)) return
    creatingRef.current.add(job.id)
    const sections = getSectionsForBtype(job.btype)
    const items = sections.map(s => ({ section: s, label: SECTION_META[s]?.title || s, details: {} }))
    try {
      const res = await fetch('/api/mrp-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, jobNum: job.num, customer: job.customer, items }),
      })
      const cl: Checklist = await res.json()
      setChecklists(prev => ({ ...prev, [job.id]: cl }))
    } finally {
      creatingRef.current.delete(job.id)
    }
  }, [checklists])

  const initJob = useCallback(async (job: Job) => {
    await ensureChecklist(job)
    if (!(job.id in bomLists)) {
      setBomLists(prev => ({ ...prev, [job.id]: null }))
      try {
        const [bomRes, piRes] = await Promise.all([
          fetch(`/api/jobs/${job.id}/boms`).then(r => r.json()),
          fetch(`/api/jobs/${job.id}/parts-info`).then(r => r.json()),
        ])
        setBomLists(prev => ({ ...prev, [job.id]: bomRes.bomList || [] }))
        setPartsInfos(prev => ({ ...prev, [job.id]: piRes || {} }))
      } catch {
        setBomLists(prev => ({ ...prev, [job.id]: [] }))
      }
    }
  }, [ensureChecklist, bomLists])

  const setStatus = useCallback(async (cl: Checklist, item: ChecklistItem, newStatus: PartStatus) => {
    const newOrdered = newStatus !== 'waiting'
    const newDetails = {
      ...(item.details as Record<string, unknown>),
      ready:  newStatus === 'ready'  || newStatus === 'picked',
      picked: newStatus === 'picked',
    }
    setChecklists(prev => ({
      ...prev,
      [cl.jobId]: {
        ...cl,
        items: cl.items.map(i => i.id === item.id
          ? { ...i, ordered: newOrdered, details: newDetails, orderedAt: newOrdered ? (i.orderedAt || new Date().toISOString()) : null }
          : i
        ),
      },
    }))
    await fetch(`/api/mrp-checklist/${cl.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, ordered: newOrdered, details: newDetails }),
    })
  }, [])

  const updateNotes = useCallback((cl: Checklist, item: ChecklistItem, notes: string) => {
    setChecklists(prev => ({
      ...prev,
      [cl.jobId]: { ...cl, items: cl.items.map(i => i.id === item.id ? { ...i, notes } : i) },
    }))
    clearTimeout(notesTimers.current[item.id])
    notesTimers.current[item.id] = setTimeout(() => {
      fetch(`/api/mrp-checklist/${cl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, notes }),
      })
    }, 800)
  }, [])

  // Jobs with all parts "ready" or "picked" — for run sheet
  const readyJobs: RunSheetJob[] = jobs
    .map(job => {
      const cl = checklists[job.id]
      if (!cl || cl.items.length === 0) return null
      const readyItems = cl.items
        .filter(i => getStatus(i) === 'ready' || getStatus(i) === 'picked')
        .map(i => SECTION_META[i.section]?.short || i.section)
      if (readyItems.length === 0) return null
      return { num: job.num, customer: job.customer, type: job.type, due: job.due, readyItems }
    })
    .filter((j): j is RunSheetJob => j !== null)

  // Filter jobs for Parts tab
  const filteredJobs = jobs.filter(job => {
    if (search) {
      const q = search.toLowerCase()
      if (!job.num.toLowerCase().includes(q) && !job.customer.toLowerCase().includes(q) && !job.type.toLowerCase().includes(q)) return false
    }
    if (filter === 'all') return true
    const cl = checklists[job.id]
    if (!cl || cl.items.length === 0) return filter === 'waiting'
    const statuses = cl.items.map(i => getStatus(i))
    if (filter === 'waiting')     return statuses.every(s => s === 'waiting')
    if (filter === 'in-progress') return statuses.some(s => s !== 'waiting') && !statuses.every(s => s === 'picked')
    if (filter === 'ready')       return statuses.every(s => s === 'ready' || s === 'picked') && statuses.some(s => s === 'ready')
    if (filter === 'picked')      return statuses.every(s => s === 'picked')
    return true
  })

  const counts = {
    all: jobs.length,
    waiting:     jobs.filter(j => { const cl = checklists[j.id]; return !cl || cl.items.every(i => getStatus(i) === 'waiting') }).length,
    'in-progress': jobs.filter(j => { const cl = checklists[j.id]; if (!cl) return false; const s = cl.items.map(i => getStatus(i)); return s.some(x => x !== 'waiting') && !s.every(x => x === 'picked') }).length,
    ready:  jobs.filter(j => { const cl = checklists[j.id]; if (!cl) return false; const s = cl.items.map(i => getStatus(i)); return s.every(x => x === 'ready' || x === 'picked') && s.some(x => x === 'ready') }).length,
    picked: jobs.filter(j => { const cl = checklists[j.id]; return cl != null && cl.items.length > 0 && cl.items.every(i => getStatus(i) === 'picked') }).length,
  }

  return (
    <div style={{ padding: '0 0 40px', fontFamily: C.font }}>

      {/* Header */}
      <div style={{ padding: '20px 28px 0', marginBottom: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: C.text3, marginBottom: 4 }}>
          Production
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: C.text1, margin: 0 }}>
            Parts Tracker
          </h1>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 2 }}>
            {(['waiting', 'ordered', 'ready', 'picked'] as PartStatus[]).map(s => {
              const st = STATUS_STYLE[s]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.dot }} />
                  <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top tabs — Parts | Run Sheet */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, padding: '0 28px', marginTop: 16 }}>
        {([['parts', 'Parts Tracker'], ['runsheet', `Run Sheet${readyJobs.length > 0 ? ` (${readyJobs.length})` : ''}`]] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '9px 20px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              color: tab === t ? C.text1 : C.text3,
              fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
              borderBottom: `2px solid ${tab === t ? C.copper : 'transparent'}`,
              marginBottom: -1,
              transition: '0.15s',
            }}
          >
            {label}
          </button>
        ))}

        {/* Print run sheet button — only on run sheet tab */}
        {tab === 'runsheet' && readyJobs.length > 0 && (
          <button
            onClick={() => printRunSheet(readyJobs)}
            style={{
              marginLeft: 'auto', padding: '7px 16px',
              background: C.copper, border: 'none', borderRadius: 5,
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
            }}
          >
            🖨️ Print Run Sheet
          </button>
        )}
      </div>

      {/* ── PARTS TAB ── */}
      {tab === 'parts' && (
        <>
          {/* Filter + Search */}
          <div style={{ padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'waiting', 'in-progress', 'ready', 'picked'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', border: 'none',
                  background: filter === f ? C.copper : 'rgba(255,255,255,0.06)',
                  color: filter === f ? '#fff' : C.text3, minHeight: 30,
                }}
              >
                {f === 'in-progress' ? 'In Progress' : f === 'ready' ? 'Ready for Pickup' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f as keyof typeof counts] ?? 0})
              </button>
            ))}
            <input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                marginLeft: 'auto', background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '6px 12px', color: C.text1, fontSize: 12,
                width: 180, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading && <div style={{ padding: 60, textAlign: 'center', color: C.text3 }}>Loading jobs…</div>}
            {!loading && filteredJobs.length === 0 && (
              <div style={{ padding: 60, textAlign: 'center', color: C.text3 }}>
                {filter === 'all' ? 'No active jobs.' : `No ${filter} jobs.`}
              </div>
            )}
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                checklist={checklists[job.id] || null}
                bomList={job.id in bomLists ? bomLists[job.id] : undefined}
                partsInfo={partsInfos[job.id] || null}
                coldformKits={coldformKits}
                onInit={() => initJob(job)}
                onSetStatus={(cl, item, status) => setStatus(cl, item, status)}
                onUpdateNotes={(cl, item, notes) => updateNotes(cl, item, notes)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── RUN SHEET TAB ── */}
      {tab === 'runsheet' && (
        <div style={{ padding: '20px 28px' }}>
          {readyJobs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: C.text3, fontSize: 13 }}>
              No jobs have parts marked as "Ready for Pickup" yet.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>
                {readyJobs.length} job{readyJobs.length !== 1 ? 's' : ''} with parts ready for Gary to pick up.
                Parts marked <span style={{ color: C.teal, fontWeight: 700 }}>Ready for Pickup</span> or{' '}
                <span style={{ color: C.green, fontWeight: 700 }}>Picked</span> appear here.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {readyJobs.map(j => (
                  <div
                    key={j.num}
                    style={{
                      background: C.panel, border: `1px solid rgba(6,182,212,0.25)`,
                      borderRadius: 8, padding: '14px 18px',
                      display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: C.copper }}>{j.num}</div>
                      {j.due && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Due {j.due}</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{j.customer || '—'}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>{j.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {j.readyItems.map(item => (
                        <span
                          key={item}
                          style={{
                            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                            color: C.teal,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: Job
  checklist: Checklist | null
  bomList: BomEntry[] | null | undefined
  partsInfo: PartsInfo | null
  coldformKits: ColdformKit[]
  onInit: () => void
  onSetStatus: (cl: Checklist, item: ChecklistItem, status: PartStatus) => void
  onUpdateNotes: (cl: Checklist, item: ChecklistItem, notes: string) => void
}

function JobCard({ job, checklist, bomList, partsInfo, coldformKits, onInit, onSetStatus, onUpdateNotes }: JobCardProps) {
  const sections = getSectionsForBtype(job.btype)
  const initDone = useRef(false)
  const [openBox, setOpenBox] = useState<string | null>(null)

  useEffect(() => {
    if (!initDone.current) { initDone.current = true; onInit() }
  }, [onInit])

  const linkedKit = coldformKits.find(k =>
    k.allocatedTo && (
      k.allocatedTo.toLowerCase().includes(job.num.toLowerCase()) ||
      (job.customer && k.allocatedTo.toLowerCase().includes(job.customer.toLowerCase().split(' ')[0]))
    )
  )

  const allReady   = checklist != null && checklist.items.length > 0 && checklist.items.every(i => getStatus(i) === 'ready' || getStatus(i) === 'picked')
  const allPicked  = checklist != null && checklist.items.length > 0 && checklist.items.every(i => getStatus(i) === 'picked')
  const anyOrdered = checklist != null && checklist.items.some(i => getStatus(i) !== 'waiting')

  const cardBorder = allPicked ? 'rgba(16,185,129,0.35)' : allReady ? 'rgba(6,182,212,0.35)' : anyOrdered ? 'rgba(232,104,26,0.2)' : C.border

  return (
    <div style={{ background: C.panel, border: `1px solid ${cardBorder}`, borderRadius: 10, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: C.copper, minWidth: 90, flexShrink: 0 }}>
          {job.num}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.customer || '—'}
          </div>
          <div style={{ fontSize: 11, color: C.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.type}</div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: 0.5,
          background: allPicked ? 'rgba(16,185,129,0.12)' : allReady ? 'rgba(6,182,212,0.12)' : anyOrdered ? 'rgba(232,104,26,0.1)' : 'rgba(255,255,255,0.05)',
          color: allPicked ? C.green : allReady ? C.teal : anyOrdered ? C.copper : C.text3,
          border: `1px solid ${allPicked ? 'rgba(16,185,129,0.3)' : allReady ? 'rgba(6,182,212,0.3)' : anyOrdered ? 'rgba(232,104,26,0.25)' : 'rgba(255,255,255,0.1)'}`,
        }}>
          {allPicked ? '✓ All Picked' : allReady ? '✓ All Ready' : anyOrdered ? 'In Progress' : 'Waiting'}
        </div>
      </div>

      {/* Part boxes — compact row, click to open dropdown */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {checklist ? (
          sections.map(sKey => {
            const item = checklist.items.find(i => i.section === sKey)
            if (!item) return null
            const status  = getStatus(item)
            const st      = STATUS_STYLE[status]
            const meta    = SECTION_META[sKey] || { icon: '📋', title: sKey, short: sKey }
            const isOpen  = openBox === sKey
            const isColdform = sKey === 'coldform-kit'
            const kitProg = isColdform && linkedKit ? kitProgress(linkedKit) : null

            return (
              <div key={sKey} style={{ flex: '1 1 130px', minWidth: 130, maxWidth: 200 }}>

                {/* Compact box — click to toggle dropdown */}
                <div
                  onClick={() => setOpenBox(isOpen ? null : sKey)}
                  style={{
                    border: `2px solid ${isOpen ? st.color : st.border}`,
                    borderRadius: isOpen ? '7px 7px 0 0' : 7,
                    background: st.bg,
                    padding: '9px 11px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta.short}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: st.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sKey === 'mrp-entry' && status !== 'waiting' ? 'Entered' : st.label}
                      </span>
                    </div>
                    {isColdform && kitProg && (
                      <div style={{ fontSize: 9, color: kitProg.done === kitProg.total ? C.green : C.amber, marginTop: 2 }}>
                        Kit {kitProg.done}/{kitProg.total}
                      </div>
                    )}
                    {sKey === 'tarp' && partsInfo?.tarp && (
                      <div style={{ fontSize: 9, color: C.text3, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[partsInfo.tarp.system, partsInfo.tarp.colour].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 9, color: C.text3, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Dropdown panel */}
                {isOpen && (
                  <div style={{
                    border: `2px solid ${st.color}`, borderTop: 'none',
                    borderRadius: '0 0 7px 7px',
                    background: C.card,
                    padding: '10px 11px 12px',
                  }}>
                    {/* Status buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                      {(sKey === 'mrp-entry'
                        ? [
                            { s: 'waiting' as PartStatus, label: 'Waiting' },
                            { s: 'picked'  as PartStatus, label: 'Entered into MrPeasy' },
                          ]
                        : (['waiting', 'ordered', 'ready', 'picked'] as PartStatus[]).map(s => ({ s, label: STATUS_STYLE[s].label }))
                      ).map(({ s, label }) => {
                        const sst = STATUS_STYLE[s]
                        const active = sKey === 'mrp-entry'
                          ? (s === 'waiting' ? status === 'waiting' : status !== 'waiting')
                          : status === s
                        return (
                          <button
                            key={s}
                            onClick={() => onSetStatus(checklist, item, s)}
                            style={{
                              padding: '6px 10px', border: `1.5px solid ${active ? sst.color : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: 5, cursor: 'pointer', textAlign: 'left',
                              background: active ? sst.bg : 'transparent',
                              color: active ? sst.color : C.text3,
                              fontSize: 11, fontWeight: active ? 700 : 500,
                              display: 'flex', alignItems: 'center', gap: 7,
                            }}
                          >
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? sst.dot : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                            {label}
                            {active && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>

                    {/* Section-specific spec info from quote */}
                    {sKey === 'tarp' && partsInfo?.tarp && (
                      <SpecBlock rows={[
                        ['System',  partsInfo.tarp.system],
                        ['Colour',  partsInfo.tarp.colour],
                        ['Length',  partsInfo.tarp.length],
                        ['Bow Size',partsInfo.tarp.bow],
                      ]} />
                    )}
                    {sKey === 'tarp' && partsInfo && !partsInfo.tarp && (
                      <div style={{ fontSize: 10, color: C.text3, marginBottom: 8 }}>No tarp on this job</div>
                    )}

                    {sKey === 'hoist' && partsInfo?.hoist && (
                      <SpecBlock rows={[
                        ['Hoist',      partsInfo.hoist.type],
                        ['Pivot',      partsInfo.hoist.pivot],
                        ['Hyd Tank',   partsInfo.hoist.hydTank],
                        ['Hydraulics', partsInfo.hoist.hydraulics],
                        ['Controls',   partsInfo.hoist.controls],
                      ]} />
                    )}

                    {sKey === 'pto' && partsInfo?.pto && (
                      <SpecBlock rows={[
                        ['PTO',     partsInfo.pto.type],
                        ['Chassis', partsInfo.pto.chassis],
                      ]} />
                    )}

                    {sKey === 'axles' && partsInfo?.axles && (
                      <SpecBlock rows={[
                        ['Make',        partsInfo.axles.make],
                        ['Count',       partsInfo.axles.count],
                        ['Type',        partsInfo.axles.type],
                        ['Suspension',  partsInfo.axles.suspension],
                        ['Stud Pattern',partsInfo.axles.studPattern],
                        ['Axle Lift',   partsInfo.axles.axleLift],
                      ]} />
                    )}

                    {/* Cold Form kit detail */}
                    {isColdform && linkedKit && kitProg && (
                      <div style={{ fontSize: 10, color: kitProg.done === kitProg.total ? C.green : C.amber, marginBottom: 8, fontWeight: 600 }}>
                        Cold Form: {kitProg.done}/{kitProg.total} components ready
                      </div>
                    )}
                    {isColdform && !linkedKit && (
                      <div style={{ fontSize: 10, color: C.text3, marginBottom: 8 }}>No kit linked to this job</div>
                    )}

                    {/* Notes */}
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: C.text3, marginBottom: 4 }}>
                      Notes / Hold-ups
                    </div>
                    <textarea
                      value={item.notes}
                      onChange={e => onUpdateNotes(checklist, item, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Order #, supplier, ETA, hold-up…"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.08)`,
                        borderRadius: 5, padding: '6px 8px',
                        color: C.text1, fontSize: 11, lineHeight: 1.5,
                        resize: 'vertical', minHeight: 60,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div style={{ fontSize: 12, color: C.text3, padding: '6px 0' }}>Setting up…</div>
        )}
      </div>

      {/* BOM — collapsible at bottom */}
      <div style={{ borderTop: `1px solid ${C.border}` }}>
        <BomSection job={job} bomList={bomList} />
      </div>
    </div>
  )
}

// ── Spec block — compact key/value table for quote-derived specs ──────────────

function SpecBlock({ rows }: { rows: [string, string][] }) {
  const filtered = rows.filter(([, v]) => v && v.trim())
  if (!filtered.length) return null
  return (
    <div style={{ marginBottom: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 5, padding: '6px 8px' }}>
      {filtered.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', gap: 8, fontSize: 10, padding: '2px 0', alignItems: 'flex-start' }}>
          <span style={{ color: C.text3, minWidth: 76, flexShrink: 0, paddingTop: 1 }}>{label}</span>
          <span style={{ color: C.text1, fontWeight: 700, lineHeight: 1.4 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── BOM Section ───────────────────────────────────────────────────────────────

function BomSection({ job, bomList }: { job: Job; bomList: BomEntry[] | null | undefined }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: 13, marginRight: 7 }}>📎</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: C.text3 }}>BOM List</span>
        {bomList != null && <span style={{ fontSize: 11, color: C.text3, marginLeft: 6 }}>({bomList.length})</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: C.text3, transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: '0.15s' }}>▼</span>
        {bomList && bomList.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); printBom(job.num, job.customer, job.type, bomList) }}
            style={{
              marginLeft: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 4, padding: '3px 10px', color: C.text2, fontSize: 10,
              fontWeight: 700, cursor: 'pointer', letterSpacing: 0.3,
            }}
          >
            🖨️ Print BOM
          </button>
        )}
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, maxHeight: 260, overflowY: 'auto' }}>
          {!bomList || bomList.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: C.text3 }}>
              {bomList === null ? 'Loading…' : 'No BOM entries.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>{['#', 'Code', 'Name', 'Section'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '5px 10px', color: C.text3, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.card }}>
                    {h}
                  </th>
                ))}</tr>
              </thead>
              <tbody>
                {bomList.map((b, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: '5px 10px', color: C.text3, width: 26 }}>{i + 1}</td>
                    <td style={{ padding: '5px 10px', color: C.copper, fontFamily: C.mono, fontWeight: 700, whiteSpace: 'nowrap' }}>{b.code}</td>
                    <td style={{ padding: '5px 10px', color: C.text2 }}>{b.name}{b.note && <span style={{ color: C.text3, marginLeft: 5, fontSize: 10 }}>({b.note})</span>}</td>
                    <td style={{ padding: '5px 10px', color: C.text3 }}>{b.section || b.category || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
