'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useJobs, updateJob, reorderJobs, syncFromMonday, createJob, useAllFiles, uploadFile, deleteFile, useDriveFiles, useJobTasks, createJobTask, updateJobTask, deleteJobTask, useJobActivity } from '@/lib/hooks'
import KanbanView from '@/components/jobs/KanbanView'
import JobActivityFeed from '@/components/jobs/JobActivityFeed'
import { STAGES, stageToBuildProgress, PROD_GROUPS, nextStage, stageIndex, deriveBtype } from '@/lib/jobTypes'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useUndo } from '@/lib/undo-context'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  DragOverEvent,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'

// ── Types ──────────────────────────────────────────

const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'issued', label: 'Issued' },
  { key: 'goahead', label: 'Go Ahead' },
  { key: 'pending', label: 'Pending' },
  { key: 'stock', label: 'Stock' },
  { key: 'finished', label: 'Finished' },
]

const TABLE_COLUMNS = [
  '', // drag handle
  'Job No.',
  'Body/Trailer Type',
  'Dealer',
  'Customer',
  'Make & Model',
  'Due',
  'On Site',
  'Engineering',
  'MRP',
  'Parts',
  'QA',
  'VASS Engineering',
  'Build Progress',
  'Notes',
  'PO',
  'Files',
  'Actions',
]

const DEFAULT_COL_WIDTHS: number[] = [
  28,   // drag handle
  100,  // Job No.
  180,  // Body/Trailer Type
  120,  // Dealer
  130,  // Customer
  130,  // Make & Model
  80,   // Due
  80,   // On Site
  90,   // Engineering
  65,   // MRP
  65,   // Parts
  65,   // QA
  130,  // VASS Engineering
  230,  // Build Progress
  160,  // Notes
  80,   // PO
  55,   // Files
  100,  // Actions
]

const COL_WIDTHS_KEY = 'ylz-jobboard-col-widths-v3'

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '\u{1F4C4}',
  'image/png': '\u{1F5BC}',
  'image/jpeg': '\u{1F5BC}',
  'image/jpg': '\u{1F5BC}',
  'image/gif': '\u{1F5BC}',
  'image/webp': '\u{1F5BC}',
  'image/svg+xml': '\u{1F5BC}',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '\u{1F4CA}',
  'application/vnd.ms-excel': '\u{1F4CA}',
  'application/msword': '\u{1F4DD}',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '\u{1F4DD}',
}


// ── Helpers ────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 7) return days + 'd ago'
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })
}

function dueDateColor(due: string): string {
  if (!due || due.trim() === '') return 'var(--text3)'
  const parts = due.split('/')
  if (parts.length !== 3) return '#fff'
  const [dd, mm, yyyy] = parts
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  if (isNaN(date.getTime())) return '#fff'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return '#ef4444'   // overdue — red
  if (days <= 14) return '#f59e0b' // within 2 weeks — amber
  return '#22c55e'                  // > 2 weeks — green
}

function getStatusPillColor(value: string): string {
  if (!value || value.trim() === '') return 'rgba(255,255,255,0.15)'
  const v = value.toLowerCase().trim()
  if (['arrived', 'yes', 'completed', 'received', 'finished'].includes(v)) return '#22d07a'
  if (['issued', 'waiting'].includes(v)) return '#3b9de8'
  if (['finished', 'in progress'].includes(v)) return '#e2e2e2'
  if (['no', 'not started', 'to be done', 'to start'].includes(v)) return '#e84560'
  if (['n/a', 'na'].includes(v)) return 'rgba(255,255,255,0.15)'
  if (v.includes('vass engineering performed')) return '#22d07a'
  if (v.includes('vass engineering pending')) return '#f59e0b'
  return 'rgba(255,255,255,0.15)'
}

// ── Sub Components ─────────────────────────────────
function StatusPill({ value }: { value: string }) {
  const display = value && value.trim() !== '' ? value : '-'
  const color = getStatusPillColor(value)
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 3,
        background: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </span>
  )
}

function BuildProgressPill({ stage }: { stage: string }) {
  const { label, color } = stageToBuildProgress(stage)
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 3,
        background: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

// ── Status dot — for Engineering / MRP / Parts / QA columns ─────────
function StatusDot({ state, doneLabel = 'Done', progressLabel = 'In Progress' }: { state: 'done' | 'progress' | 'waiting'; doneLabel?: string; progressLabel?: string }) {
  const color = state === 'done' ? '#22d07a' : state === 'progress' ? '#f59e0b' : 'rgba(255,255,255,0.15)'
  const label = state === 'done' ? doneLabel : state === 'progress' ? progressLabel : '—'
  return (
    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 8, color, fontWeight: 700, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    </td>
  )
}

// ── Build progress bar — 5 segments from stage ───────────────────────
function BuildProgressBar({ stage, btype }: { stage: string; btype: string }) {
  const idx = stageIndex(stage)
  const fabIdx = stageIndex('Fab')
  const paintIdx = stageIndex('Paint')
  const fitoutIdx = stageIndex('Fitout')

  const isAlloy = btype?.includes('ally')
  const isTrailer = btype?.includes('trailer') || btype === 'dolly' || btype === 'beavertail'

  const segments = [
    { label: isAlloy ? 'Alloy' : 'Hardox', activeAt: fabIdx },
    { label: 'Body', activeAt: fabIdx },
    { label: isTrailer ? 'Trailer Chs.' : 'Truck Chs.', activeAt: fabIdx },
    { label: 'Paint', activeAt: paintIdx },
    { label: 'Fitout', activeAt: fitoutIdx },
  ]

  return (
    <td style={{ padding: '6px 10px' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
        {segments.map(seg => {
          const done = idx > seg.activeAt
          const active = idx === seg.activeAt
          const barColor = done ? '#22d07a' : active ? '#f59e0b' : 'rgba(255,255,255,0.1)'
          const textColor = done ? '#22d07a' : active ? '#f59e0b' : 'rgba(255,255,255,0.2)'
          return (
            <div key={seg.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
              <div style={{ height: 6, width: '100%', borderRadius: 3, background: barColor }} />
              <span style={{ fontSize: 7, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
                {seg.label}
              </span>
            </div>
          )
        })}
      </div>
    </td>
  )
}

// ── Site toggle — click to mark truck on site ────────────────────────
function SiteToggleCell({ value, jobId, onSave }: { value: string; jobId: string; onSave: (id: string, field: string, val: string, old: string) => void }) {
  const isOnSite = value?.toLowerCase() === 'arrived' || value?.toLowerCase() === 'yes'
  return (
    <td style={{ padding: '8px 6px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => onSave(jobId, 'site', isOnSite ? '' : 'Arrived', value || '')}
        style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
          padding: '3px 7px', borderRadius: 3, cursor: 'pointer',
          background: isOnSite ? 'rgba(34,208,122,0.12)' : 'rgba(255,255,255,0.05)',
          color: isOnSite ? '#22d07a' : 'rgba(255,255,255,0.25)',
          border: `1px solid ${isOnSite ? 'rgba(34,208,122,0.35)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        {isOnSite ? '✓ On Site' : 'No'}
      </button>
    </td>
  )
}

// ── VASS Engineering cell ─────────────────────────────────────────────
const VASS_OPTIONS = ['', 'To Be Done', 'Ready for Inspection', 'Inspected', 'Booked in'] as const
const vassColor = (v: string) => {
  if (v === 'Booked in') return { color: '#22d07a', bg: 'rgba(34,208,122,0.1)', border: 'rgba(34,208,122,0.3)' }
  if (v === 'Inspected') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' }
  if (v === 'To Be Done') return { color: '#e84560', bg: 'rgba(232,69,96,0.1)', border: 'rgba(232,69,96,0.3)' }
  return { color: 'rgba(255,255,255,0.25)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' }
}
function VassEngineeringCell({ value, jobId, onSave }: { value: string; jobId: string; onSave: (id: string, field: string, val: string, old: string) => void }) {
  const c = vassColor(value)
  return (
    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
      <select
        value={value || ''}
        onChange={e => onSave(jobId, 'vass', e.target.value, value || '')}
        style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 4,
          color: c.color, fontSize: 10, fontWeight: 700, cursor: 'pointer',
          outline: 'none', padding: '3px 6px', width: '100%',
          fontFamily: "'League Spartan', sans-serif", letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {VASS_OPTIONS.map(o => <option key={o} value={o} style={{ color: '#fff', background: '#111' }}>{o || '—'}</option>)}
      </select>
    </td>
  )
}

// ── Derive MRP / Parts status from checklist ─────────────────────────
function getMrpStatus(checklist: any): 'done' | 'waiting' {
  if (!checklist?.items) return 'waiting'
  const item = checklist.items.find((i: any) => i.section === 'mrp-entry')
  if (!item) return 'waiting'
  const d = item.details || {}
  return item.ordered || d.picked ? 'done' : 'waiting'
}

function getPartsStatus(checklist: any): 'done' | 'progress' | 'waiting' {
  if (!checklist?.items) return 'waiting'
  const items = checklist.items.filter((i: any) => i.section !== 'mrp-entry')
  if (!items.length) return 'waiting'
  const allPicked = items.every((i: any) => { const d = i.details || {}; return d.picked || d.ready })
  const anyOrdered = items.some((i: any) => i.ordered)
  if (allPicked) return 'done'
  if (anyOrdered) return 'progress'
  return 'waiting'
}

// ── Status dropdown options ──────────────────────────
const STATUS_OPTIONS = ['Arrived', 'Issued', 'Ordered', 'Pending', 'Waiting', 'In Progress', 'Completed', 'Yes', 'No', 'N/A', '']

// ── Editable Text Cell ──────────────────────────────
function EditableTextCell({
  value,
  jobId,
  field,
  onSave,
  style: cellStyle,
}: {
  value: string
  jobId: string
  field: string
  onSave: (jobId: string, field: string, newVal: string, oldVal: string) => void
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const save = () => {
    setEditing(false)
    if (draft !== value) {
      onSave(jobId, field, draft, value)
    }
  }

  if (editing) {
    return (
      <td style={{ padding: '4px 6px', ...cellStyle }} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          }}
          style={{
            background: 'var(--dark3)',
            border: '1px solid var(--accent)',
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
    )
  }

  return (
    <td
      style={{ padding: '8px 10px', cursor: 'pointer', ...cellStyle }}
      onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      title="Click to edit"
    >
      {value || '-'}
    </td>
  )
}

// ── Editable Status Pill Cell ────────────────────────
function EditableStatusCell({
  value,
  jobId,
  field,
  onSave,
  options = STATUS_OPTIONS,
}: {
  value: string
  jobId: string
  field: string
  onSave: (jobId: string, field: string, newVal: string, oldVal: string) => void
  options?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.left, y: rect.bottom + 2 })
    }
    setOpen((v) => !v)
  }

  return (
    <td
      ref={ref}
      style={{ padding: '8px 10px', cursor: 'pointer' }}
      onClick={handleClick}
    >
      <StatusPill value={value} />
      {open && (
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            zIndex: 9999,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4,
            padding: 4,
            minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const color = getStatusPillColor(opt)
            return (
              <div
                key={opt || '__clear'}
                onClick={() => { setOpen(false); if (opt !== value) onSave(jobId, field, opt, value) }}
                style={{
                  padding: '7px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 3,
                  color: opt ? color : 'var(--text3)',
                  background: opt === value ? 'rgba(255,255,255,0.08)' : 'transparent',
                  transition: '0.1s',
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = opt === value ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                {opt || '— Clear —'}
                {opt === value && <span style={{ marginLeft: 'auto', color: '#E8681A', fontSize: 12 }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </td>
  )
}

// ── Editable Stage Pill Cell ─────────────────────────
function EditableStagePill({
  stage,
  jobId,
  onSave,
}: {
  stage: string
  jobId: string
  onSave: (jobId: string, field: string, newVal: string, oldVal: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ x: rect.left, y: rect.bottom + 2 })
    }
    setOpen((v) => !v)
  }

  return (
    <td
      ref={ref}
      style={{ padding: '8px 10px', cursor: 'pointer' }}
      onClick={handleClick}
    >
      <BuildProgressPill stage={stage} />
      {open && (
        <div
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            zIndex: 9999,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 4,
            padding: 4,
            minWidth: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {STAGES.map((s) => {
            const { label, color } = stageToBuildProgress(s)
            return (
              <div
                key={s}
                onClick={() => { setOpen(false); if (s !== stage) onSave(jobId, 'stage', s, stage) }}
                style={{
                  padding: '7px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 3,
                  color: color,
                  background: s === stage ? 'rgba(255,255,255,0.08)' : 'transparent',
                  transition: '0.1s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 36,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = s === stage ? 'rgba(255,255,255,0.08)' : 'transparent' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
                {s === stage && <span style={{ marginLeft: 'auto', color: '#E8681A', fontSize: 12 }}>✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </td>
  )
}

// ── Droppable Group ────────────────────────────────
function DroppableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <tbody
      ref={setNodeRef}
      style={{
        outline: isOver ? '2px solid rgba(59,157,232,0.5)' : 'none',
        outlineOffset: -2,
        transition: 'outline 0.15s',
      }}
    >
      {children}
    </tbody>
  )
}

// ── Draggable Job Row ──────────────────────────────
function DraggableJobRow({
  job,
  user,
  checklist,
  isExpanded,
  onToggleExpand,
  onAdvance,
  onDelete,
  onFieldSave,
  fileCount,
  jobFiles,
  fileInputRef,
  uploading,
  onUpload,
  onDeleteFile,
  onFileDrop: _onFileDrop,
  dragOverFile: _dragOverFile,
  setDragOverFile: _setDragOverFile,
  onContextMenu,
}: {
  job: any
  user: any
  checklist: any
  isExpanded: boolean
  onToggleExpand: () => void
  onAdvance: (id: string) => void
  onDelete: (id: string, num: string) => void
  onFieldSave: (jobId: string, field: string, newVal: string, oldVal: string) => void
  fileCount: number
  jobFiles: any[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  onUpload: (jobId: string, files: FileList | File[]) => void
  onDeleteFile: (fileId: string) => void
  onFileDrop: (e: React.DragEvent, jobId: string) => void
  dragOverFile: string | null
  setDragOverFile: (id: string | null) => void
  onContextMenu: (e: React.MouseEvent, job: any) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: job.id,
    data: { type: 'job', job },
  })

  const canAdvanceJob = user?.canAdvance && nextStage(job.stage) !== null

  const style: React.CSSProperties = {
    background: isDragging ? 'rgba(59,157,232,0.1)' : 'var(--dark2)',
    borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
    fontSize: 11,
    color: 'var(--text2)',
    transition: isDragging ? 'none' : 'background 0.12s',
    opacity: isDragging ? 0.5 : 1,
    cursor: 'pointer',
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
  }

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        onClick={onToggleExpand}
        onContextMenu={(e) => onContextMenu(e, job)}
        onMouseEnter={(e) => {
          if (!isDragging && !isExpanded) e.currentTarget.style.background = 'var(--dark3)'
        }}
        onMouseLeave={(e) => {
          if (!isDragging && !isExpanded) e.currentTarget.style.background = 'var(--dark2)'
        }}
      >
        {/* Drag handle */}
        <td
          style={{ padding: '8px 4px 8px 10px', width: 28, cursor: 'grab', color: 'var(--text3)' }}
          onClick={(e) => e.stopPropagation()}
          {...listeners}
          {...attributes}
        >
          <span style={{ fontSize: 14, opacity: 0.4, userSelect: 'none' }}>&#9776;</span>
        </td>

        {/* Job No */}
        <td
          style={{
            padding: '8px 10px',
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ marginRight: 6, fontSize: 10, color: 'var(--text3)' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          {job.num}
        </td>

        {/* Body/Trailer Type */}
        <EditableTextCell value={job.type || ''} jobId={job.id} field="type" onSave={onFieldSave} style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />

        {/* Dealer */}
        <EditableTextCell value={job.dealer || ''} jobId={job.id} field="dealer" onSave={onFieldSave} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }} />

        {/* Customer */}
        <EditableTextCell value={job.customer || ''} jobId={job.id} field="customer" onSave={onFieldSave} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }} />

        {/* Make & Model */}
        <EditableTextCell value={job.make || ''} jobId={job.id} field="make" onSave={onFieldSave} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }} />

        {/* Due */}
        <EditableTextCell value={job.due || ''} jobId={job.id} field="due" onSave={onFieldSave} style={{ fontWeight: 600, color: dueDateColor(job.due || ''), whiteSpace: 'nowrap' }} />

        {/* On Site — manual toggle */}
        <SiteToggleCell value={job.site || ''} jobId={job.id} onSave={onFieldSave} />

        {/* Engineering — green once past Requires Engineering */}
        <StatusDot
          state={stageIndex(job.stage) > stageIndex('Requires Engineering') ? 'done' : stageIndex(job.stage) === stageIndex('Requires Engineering') ? 'progress' : 'waiting'}
          doneLabel="Approved"
          progressLabel="Pending"
        />

        {/* MRP — from parts tracker mrp-entry */}
        <StatusDot state={getMrpStatus(checklist) === 'done' ? 'done' : 'waiting'} doneLabel="Entered" />

        {/* Parts — from parts tracker */}
        <StatusDot
          state={getPartsStatus(checklist)}
          doneLabel="All Ready"
          progressLabel="Ordered"
        />

        {/* QA — from job stage */}
        <StatusDot
          state={stageIndex(job.stage) > stageIndex('QC') ? 'done' : stageIndex(job.stage) === stageIndex('QC') ? 'progress' : 'waiting'}
          doneLabel="Passed"
          progressLabel="In QC"
        />

        {/* VASS Engineering */}
        <VassEngineeringCell value={job.vass || ''} jobId={job.id} onSave={onFieldSave} />

        {/* Build Progress — loading bar */}
        <BuildProgressBar stage={job.stage} btype={job.btype || deriveBtype(job.type || '')} />

        {/* Notes */}
        <EditableTextCell value={job.notes || ''} jobId={job.id} field="notes" onSave={onFieldSave} style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text3)', fontSize: 10 }} />

        {/* PO */}
        <EditableTextCell value={job.po || ''} jobId={job.id} field="po" onSave={onFieldSave} style={{ whiteSpace: 'nowrap' }} />

        {/* Files count */}
        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
          {fileCount > 0 ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(59,157,232,0.15)', color: '#3b9de8', border: '1px solid rgba(59,157,232,0.3)' }}>
              {fileCount}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>&mdash;</span>
          )}
        </td>

        {/* Actions */}
        <td style={{ padding: '8px 10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {canAdvanceJob && (
              <button
                onClick={(e) => { e.stopPropagation(); onAdvance(job.id) }}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--accent)',
                  whiteSpace: 'nowrap',
                  transition: '0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--btn-primary)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--accent)' }}
              >
                &rarr; Advance
              </button>
            )}
            {user?.fullAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(job.id, job.num) }}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  padding: '4px 10px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1px solid rgba(255,80,80,0.25)',
                  background: 'rgba(255,80,80,0.06)',
                  color: 'rgba(255,80,80,0.6)',
                  whiteSpace: 'nowrap',
                  transition: '0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.15)'; e.currentTarget.style.color = '#ff5050' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.06)'; e.currentTarget.style.color = 'rgba(255,80,80,0.6)' }}
              >
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded File Section */}
      {isExpanded && (
        <tr key={job.id + '_files'}>
          <td colSpan={TABLE_COLUMNS.length} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
              {/* Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{'\u{1F4C1}'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text2)' }}>
                    Job Sheets &amp; Drawings &mdash; {job.num}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>
                    ({fileCount} file{fileCount !== 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                  disabled={uploading}
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: '6px 14px',
                    borderRadius: 4,
                    cursor: uploading ? 'wait' : 'pointer',
                    border: '1px solid rgba(59,157,232,0.4)',
                    background: 'rgba(59,157,232,0.1)',
                    color: '#3b9de8',
                    transition: '0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,157,232,0.2)'; e.currentTarget.style.borderColor = '#3b9de8' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,157,232,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,157,232,0.4)' }}
                >
                  {uploading ? '\u23F3 Uploading...' : '+ Upload File'}
                </button>
              </div>

              {/* Drop Zone / File Grid */}
              {fileCount === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b9de8'; e.currentTarget.style.background = 'rgba(59,157,232,0.06)' }}
                  onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent' }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent'; if (e.dataTransfer.files.length > 0) onUpload(job.id, e.dataTransfer.files) }}
                  style={{ border: '2px dashed var(--border2)', borderRadius: 6, padding: '28px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 12, transition: '0.2s', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>{'\u{1F4C2}'}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No files uploaded yet</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Drag &amp; drop files here, or click to browse</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, opacity: 0.7 }}>PDF, images, Word, Excel, DWG supported</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {jobFiles.map((file: any) => {
                    const isDrive = file.source === 'drive'
                    const isGenerated = file.fileType === 'generated/jsheet'
                    const jobIdFromPath = isGenerated ? file.filePath?.replace('jsheet:', '') : null
                    const icon = isGenerated ? '📋' : (FILE_TYPE_ICONS[file.fileType] || '\u{1F4CE}')
                    const isImage = file.fileType?.startsWith('image/')
                    const isPdf = file.fileType === 'application/pdf'
                    const fileUrl = isGenerated ? `/jsheet/${jobIdFromPath}` : (isDrive ? `/api/drive-files/${file.id}` : `/api/files/${file.id}`)
                    return (
                      <div
                        key={(isDrive ? 'drive-' : '') + file.id}
                        style={{ background: isGenerated ? 'rgba(232,104,26,0.06)' : 'var(--dark3)', border: `1px solid ${isGenerated ? 'rgba(232,104,26,0.4)' : isDrive ? 'rgba(66,133,244,0.3)' : 'var(--border)'}`, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, transition: '0.15s', position: 'relative' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = isGenerated ? '#E8681A' : isDrive ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.2)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = isGenerated ? 'rgba(232,104,26,0.4)' : isDrive ? 'rgba(66,133,244,0.3)' : 'var(--border)' }}
                      >
                        {isGenerated && (
                          <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, background: 'rgba(232,104,26,0.15)', color: '#E8681A', border: '1px solid rgba(232,104,26,0.3)' }}>
                            Generated
                          </div>
                        )}
                        {isDrive && !isGenerated && (
                          <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, background: 'rgba(66,133,244,0.15)', color: '#4285f4', border: '1px solid rgba(66,133,244,0.3)' }}>
                            Drive
                          </div>
                        )}
                        {isImage && !isDrive ? (
                          <div style={{ width: '100%', height: 100, borderRadius: 4, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={fileUrl} alt={file.fileName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: 60, borderRadius: 4, background: isGenerated ? 'rgba(232,104,26,0.08)' : isDrive ? 'rgba(66,133,244,0.06)' : 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                            {icon}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.fileName}>
                            {file.fileName}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 8 }}>
                            {!isGenerated && <span>{formatFileSize(file.fileSize)}</span>}
                            {isGenerated && <span style={{ color: 'rgba(232,104,26,0.8)' }}>Body · Fitout · Paint</span>}
                            {file.createdAt && <><span>&bull;</span><span>{timeAgo(file.createdAt)}</span></>}
                          </div>
                          {file.uploadedBy && !isGenerated && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>by {file.uploadedBy}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', padding: '5px 8px', borderRadius: 3, background: isGenerated ? 'rgba(232,104,26,0.12)' : isDrive ? 'rgba(66,133,244,0.08)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isGenerated ? 'rgba(232,104,26,0.4)' : isDrive ? 'rgba(66,133,244,0.3)' : 'var(--border2)'}`, color: isGenerated ? '#E8681A' : isDrive ? '#4285f4' : 'var(--text2)', textDecoration: 'none', cursor: 'pointer', transition: '0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = isGenerated ? 'rgba(232,104,26,0.2)' : isDrive ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = isGenerated ? '#ff8c4a' : isDrive ? '#5a9cf5' : '#fff' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isGenerated ? 'rgba(232,104,26,0.12)' : isDrive ? 'rgba(66,133,244,0.08)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = isGenerated ? '#E8681A' : isDrive ? '#4285f4' : 'var(--text2)' }}
                          >
                            {isGenerated ? 'View / Print' : isPdf || isImage ? 'View' : 'Download'}
                          </a>
                          {!isDrive && (user?.canEdit || user?.fullAdmin) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id) }}
                              style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '5px 8px', borderRadius: 3, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: 'rgba(255,80,80,0.7)', cursor: 'pointer', transition: '0.15s', fontFamily: "'League Spartan', sans-serif" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.15)'; e.currentTarget.style.color = '#ff5050' }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; e.currentTarget.style.color = 'rgba(255,80,80,0.7)' }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Add more card */}
                  <div
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b9de8'; e.currentTarget.style.background = 'rgba(59,157,232,0.06)' }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent' }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent'; if (e.dataTransfer.files.length > 0) onUpload(job.id, e.dataTransfer.files) }}
                    style={{ border: '2px dashed var(--border2)', borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer', transition: '0.2s', minHeight: 120, color: 'var(--text3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'var(--text2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>Add File</div>
                  </div>
                </div>
              )}
            </div>

            {/* Tasks + Activity Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 16, marginTop: 16 }}>
              <JobTasksPanel jobId={job.id} jobNum={job.num} user={user} />
              <JobActivityPanel jobId={job.id} />
              {/* Rich activity feed with photos/notes */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 400 }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span>💬 Notes & Photos</span>
                  {job.stage === 'Dispatch' && (
                    <a
                      href={`/signoff/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 9, fontWeight: 700, color: '#22d07a', textDecoration: 'none', letterSpacing: 0.8, border: '1px solid #22d07a44', borderRadius: 3, padding: '2px 8px' }}
                    >
                      ✍ Sign-off →
                    </a>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <JobActivityFeed
                    jobId={job.id}
                    jobNum={job.num}
                    userId={user?.id || ''}
                    userName={user?.name || ''}
                    userColor={user?.color || '#E8681A'}
                  />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Job Tasks Panel ─────────────────────────────────
function JobTasksPanel({ jobId, jobNum: _jobNum, user }: { jobId: string; jobNum: string; user: any }) {
  const { data: tasks, mutate } = useJobTasks(jobId)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newTitle.trim()) return
    await createJobTask(jobId, { title: newTitle.trim() })
    setNewTitle('')
    setAdding(false)
    mutate()
  }

  async function handleToggle(task: any) {
    await updateJobTask(jobId, task.id, { completed: !task.completed, completedBy: user?.name || '' })
    mutate()
  }

  async function handleDelete(taskId: string) {
    await deleteJobTask(jobId, taskId)
    mutate()
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)' }}>
          ✓ Tasks ({tasks?.length || 0})
        </span>
        <button
          onClick={() => setAdding(a => !a)}
          style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)' }}
        >
          + Add
        </button>
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Task title..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border2)', borderRadius: 4, color: '#fff', fontSize: 12, padding: '5px 10px', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={handleAdd} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', border: 'none', background: '#E8681A', color: '#fff' }}>Save</button>
          <button onClick={() => setAdding(false)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 3, cursor: 'pointer', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)' }}>✕</button>
        </div>
      )}

      {(!tasks || tasks.length === 0) && !adding && (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>No tasks yet</div>
      )}

      {tasks?.map((task: any) => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => handleToggle(task)}
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#E8681A', flexShrink: 0 }}
          />
          <span style={{ flex: 1, fontSize: 12, color: task.completed ? 'var(--text3)' : 'var(--text2)', textDecoration: task.completed ? 'line-through' : 'none' }}>
            {task.title}
          </span>
          {task.assignedTo && (
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{task.assignedTo}</span>
          )}
          {(user?.canEdit || user?.fullAdmin) && (
            <button onClick={() => handleDelete(task.id)} style={{ fontSize: 10, color: 'rgba(255,80,80,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>✕</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Job Activity Panel ──────────────────────────────
function JobActivityPanel({ jobId }: { jobId: string }) {
  const { data: activity } = useJobActivity(jobId)

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10 }}>
        📋 Activity Log
      </div>
      {(!activity || activity.length === 0) && (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>No activity recorded yet</div>
      )}
      {activity?.map((a: any) => (
        <div key={a.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E8681A', marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>
              <span style={{ color: 'var(--text3)' }}>{a.field}</span>
              {a.fromValue && a.toValue && (
                <span> <em style={{ color: 'var(--text3)', textDecoration: 'line-through' }}>{a.fromValue}</em> → <em style={{ color: '#fff' }}>{a.toValue}</em></span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>
              {a.userName && <span>{a.userName} · </span>}
              {new Date(a.createdAt).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────
export default function JobBoardPage() {
  const { data: session } = useSession()
  const { data: jobs, mutate } = useJobs()
  const { data: allFiles, mutate: mutateFiles } = useAllFiles()
  const user = session?.user as any
  const { pushUndo } = useUndo()

  const searchParams = useSearchParams()

  // State
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [activeFilter, setActiveFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ finished: true })
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    if (typeof window !== 'undefined') {
      try { return (localStorage.getItem('ylz-jobboard-view') as 'table' | 'kanban') || 'table' } catch {}
    }
    return 'table'
  })
  const [activityJobId, setActivityJobId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOverJob, setDragOverJob] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overGroupId, setOverGroupId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; jobId: string; job: any } | null>(null)
  const [checklistMap, setChecklistMap] = useState<Record<string, any>>({})

  // Load checklists for MRP/Parts status indicators
  useEffect(() => {
    fetch('/api/mrp-checklist')
      .then(r => r.json())
      .then((cls: any[]) => {
        if (!Array.isArray(cls)) return
        const map: Record<string, any> = {}
        cls.forEach(cl => { map[cl.jobId] = cl })
        setChecklistMap(map)
      })
      .catch(() => {})
  }, [])

  // Column resize state
  const [colWidths, setColWidths] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(COL_WIDTHS_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length === DEFAULT_COL_WIDTHS.length) return parsed
        }
      } catch {}
    }
    return [...DEFAULT_COL_WIDTHS]
  })
  const resizingCol = useRef<{ idx: number; startX: number; startW: number } | null>(null)

  // Persist column widths to localStorage
  useEffect(() => {
    try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(colWidths)) } catch {}
  }, [colWidths])

  // Context menu closed via overlay (see render below)

  // Column resize handlers
  const onResizeStart = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizingCol.current = { idx, startX: e.clientX, startW: colWidths[idx] }

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return
      const diff = ev.clientX - resizingCol.current.startX
      const newW = Math.max(30, resizingCol.current.startW + diff)
      setColWidths((prev) => {
        const next = [...prev]
        next[resizingCol.current!.idx] = newW
        return next
      })
    }

    const onMouseUp = () => {
      resizingCol.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [colWidths])

  const resetColWidths = useCallback(() => {
    setColWidths([...DEFAULT_COL_WIDTHS])
  }, [])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // New job form
  const [newJob, setNewJob] = useState({
    num: '',
    type: '',
    customer: '',
    dealer: '',
    due: '',
    prodGroup: 'pending',
  })
  const [savingJob, setSavingJob] = useState(false)
  const [jobMessage, setJobMessage] = useState('')
  const [poFile, setPoFile] = useState<File | null>(null)
  const poInputRef = useRef<HTMLInputElement | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Drive files for expanded job
  const expandedJobData = useMemo(() => {
    if (!expandedJob || !jobs) return null
    return (jobs as any[]).find((j: any) => j.id === expandedJob) || null
  }, [expandedJob, jobs])
  const { data: driveFiles } = useDriveFiles(expandedJobData?.num || null)

  // File map — merge local files with Drive files for expanded job
  const filesByJob = useMemo(() => {
    if (!allFiles) return {} as Record<string, any[]>
    const map: Record<string, any[]> = {}
    for (const f of allFiles as any[]) {
      if (!map[f.jobId]) map[f.jobId] = []
      map[f.jobId].push(f)
    }
    // Merge Drive files into the expanded job's file list
    if (expandedJob && driveFiles && Array.isArray(driveFiles) && driveFiles.length > 0) {
      const existing = map[expandedJob] || []
      const driveEntries = driveFiles.map((df: any) => ({
        id: df.id,
        fileName: df.name,
        fileType: df.mimeType,
        fileSize: df.size,
        createdAt: df.modifiedTime,
        uploadedBy: '',
        source: 'drive',
      }))
      map[expandedJob] = [...driveEntries, ...existing]
    }
    return map
  }, [allFiles, expandedJob, driveFiles])

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!jobs) return []
    let list = jobs as any[]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (j: any) =>
          j.num?.toLowerCase().includes(q) ||
          j.type?.toLowerCase().includes(q) ||
          j.customer?.toLowerCase().includes(q) ||
          j.dealer?.toLowerCase().includes(q)
      )
    }
    if (activeFilter !== 'all') {
      list = list.filter((j: any) => j.prodGroup === activeFilter)
    }
    if (stageFilter !== 'all') {
      list = list.filter((j: any) => j.stage === stageFilter)
    }
    return list
  }, [jobs, search, activeFilter, stageFilter])

  // Grouped
  const groupedJobs = useMemo(() => {
    const groups: Record<string, any[]> = {}
    for (const g of PROD_GROUPS) {
      groups[g.key] = filteredJobs.filter((j: any) => j.prodGroup === g.key)
    }
    return groups
  }, [filteredJobs])

  // Handlers
  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAdvance = async (jobId: string) => {
    if (!user?.canAdvance) return
    try {
      await fetch(`/api/jobs/${jobId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _userId: user?.id || '', _userName: user?.name || '' }),
      })
      mutate()
    } catch (e) {
      console.error('Failed to advance:', e)
    }
  }

  const handleMoveGroup = useCallback(async (jobId: string, newGroup: string) => {
    setContextMenu(null)
    mutate((current: any) => Array.isArray(current) ? current.map((j: any) => j.id === jobId ? { ...j, prodGroup: newGroup } : j) : current, { revalidate: false })
    try {
      await updateJob(jobId, { prodGroup: newGroup, _userId: user?.id || '', _userName: user?.name || '' })
      mutate()
    } catch (e) {
      console.error('Failed to move group:', e)
      mutate()
    }
  }, [mutate, user?.id, user?.name])

  const handleMoveStage = useCallback(async (jobId: string, newStage: string) => {
    setContextMenu(null)
    mutate((current: any) => Array.isArray(current) ? current.map((j: any) => j.id === jobId ? { ...j, stage: newStage } : j) : current, { revalidate: false })
    try {
      await fetch(`/api/jobs/${jobId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage, userId: user?.id || '', userName: user?.name || '' }),
      })
      mutate()
    } catch (e) {
      console.error('Failed to move stage:', e)
      mutate()
    }
  }, [mutate, user?.id, user?.name])

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; num: string } | null>(null)

  const handleDeleteJob = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      mutate()
    } catch (e) {
      console.error('Failed to delete job:', e)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleFieldSave = useCallback(async (jobId: string, field: string, newVal: string, oldVal: string) => {
    // Optimistic update
    mutate(
      (current: any) =>
        current?.map((j: any) =>
          j.id === jobId ? { ...j, [field]: newVal } : j
        ),
      false
    )
    try {
      await updateJob(jobId, { [field]: newVal, _userId: user?.id || '', _userName: user?.name || '' })
      mutate()
      // Push undo
      pushUndo({
        label: `Edit ${field}`,
        execute: async () => {
          await updateJob(jobId, { [field]: oldVal, _userId: user?.id || '', _userName: user?.name || '' })
          mutate()
        },
      })
    } catch (e) {
      console.error('Failed to save field:', e)
      mutate() // revert
    }
  }, [mutate, pushUndo, user?.id, user?.name])

  const handleSync = async () => {
    if (!confirm('Sync jobs from Monday.com? This will update existing jobs and create new ones.')) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const data = await syncFromMonday()
      if (data.success) {
        setSyncResult(`Synced: ${data.summary.created} created, ${data.summary.updated} updated${data.summary.errors > 0 ? `, ${data.summary.errors} errors` : ''}`)
        mutate()
      } else {
        setSyncResult(`Sync failed: ${data.error}`)
      }
    } catch (err: any) {
      setSyncResult(`Sync failed: ${err.message}`)
    }
    setSyncing(false)
    setTimeout(() => setSyncResult(null), 6000)
  }

  const handleUpload = useCallback(async (jobId: string, files: FileList | File[]) => {
    if (!user) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadFile(jobId, file, user.name || '')
      }
      mutateFiles()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [user, mutateFiles])

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Delete this file?')) return
    try {
      await deleteFile(fileId)
      mutateFiles()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }, [mutateFiles])

  const handleFileDrop = useCallback((e: React.DragEvent, jobId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverJob(null)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(jobId, e.dataTransfer.files)
      setExpandedJob(jobId)
    }
  }, [handleUpload])

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over) {
      // Check if over is a group droppable or a job within a group
      const groupKeys: string[] = PROD_GROUPS.map((g) => g.key)
      if (groupKeys.includes(over.id as string)) {
        setOverGroupId(over.id as string)
      } else {
        // It's a job row — find which group it belongs to
        const overJob = (jobs as any[])?.find((j: any) => j.id === over.id)
        if (overJob) {
          setOverGroupId(overJob.prodGroup)
        }
      }
    } else {
      setOverGroupId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverGroupId(null)

    if (!over || !active) return

    const draggedJobId = active.id as string
    const draggedJob = (jobs as any[])?.find((j: any) => j.id === draggedJobId)
    if (!draggedJob) return

    // Determine target group
    const groupKeys: string[] = PROD_GROUPS.map((g) => g.key)
    let targetGroup: string | null = null

    if (groupKeys.includes(over.id as string)) {
      targetGroup = over.id as string
    } else {
      const overJob = (jobs as any[])?.find((j: any) => j.id === over.id)
      if (overJob) {
        targetGroup = overJob.prodGroup
      }
    }

    if (!targetGroup) return

    // SAME GROUP → reorder within group
    if (targetGroup === draggedJob.prodGroup) {
      const group = groupedJobs[targetGroup] || []
      const oldIndex = group.findIndex((j: any) => j.id === active.id)
      const overIdx = group.findIndex((j: any) => j.id === over.id)
      if (oldIndex === -1 || overIdx === -1 || oldIndex === overIdx) return

      const reordered = arrayMove(group, oldIndex, overIdx)
      const items = reordered.map((j: any, i: number) => ({ id: j.id, sortOrder: i }))

      // Optimistic
      mutate(
        (current: any) => {
          if (!current) return current
          const updated = [...current]
          for (const item of items) {
            const idx = updated.findIndex((j: any) => j.id === item.id)
            if (idx !== -1) updated[idx] = { ...updated[idx], sortOrder: item.sortOrder }
          }
          return updated
        },
        false
      )

      try {
        await reorderJobs(items)
        mutate()
      } catch (e) {
        console.error('Failed to reorder:', e)
        mutate()
      }
      return
    }

    // DIFFERENT GROUP → move to new group + set sort order at end
    const targetJobs = groupedJobs[targetGroup] || []
    const newSortOrder = targetJobs.length > 0
      ? Math.max(...targetJobs.map((j: any) => j.sortOrder ?? 0)) + 1
      : 0

    // Optimistic update
    mutate(
      (current: any) =>
        current?.map((j: any) =>
          j.id === draggedJobId ? { ...j, prodGroup: targetGroup, sortOrder: newSortOrder } : j
        ),
      false
    )

    try {
      await reorderJobs([{ id: draggedJobId, sortOrder: newSortOrder, prodGroup: targetGroup }])
      mutate()
    } catch (e) {
      console.error('Failed to move job:', e)
      mutate() // revert
    }
  }

  const handleCreateJob = async () => {
    if (!newJob.num.trim()) {
      setJobMessage('Job number is required')
      setTimeout(() => setJobMessage(''), 3000)
      return
    }
    setSavingJob(true)
    try {
      const job = await createJob({
        num: newJob.num.trim(),
        type: newJob.type.trim(),
        customer: newJob.customer.trim(),
        dealer: newJob.dealer.trim(),
        due: newJob.due.trim(),
        prodGroup: newJob.prodGroup,
        stage: 'Fab',
        btype: deriveBtype(newJob.type),
      })
      // Upload PO file if attached
      if (poFile && job?.id) {
        try {
          await uploadFile(job.id, poFile, user?.name || '')
          mutateFiles()
        } catch (e) {
          console.error('PO upload failed:', e)
        }
      }
      mutate()
      setShowNewJobModal(false)
      setNewJob({ num: '', type: '', customer: '', dealer: '', due: '', prodGroup: 'pending' })
      setPoFile(null)
      setJobMessage('Job created')
      setTimeout(() => setJobMessage(''), 3000)
    } catch {
      setJobMessage('Failed to create job')
    }
    setSavingJob(false)
    setTimeout(() => setJobMessage(''), 3000)
  }

  // Sort by Stage
  const handleSortByStage = useCallback(async () => {
    if (!jobs) return
    const allItems: { id: string; sortOrder: number }[] = []
    for (const group of PROD_GROUPS) {
      const groupJobs = (jobs as any[]).filter((j: any) => j.prodGroup === group.key)
      const sorted = [...groupJobs].sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage))
      sorted.forEach((j, i) => allItems.push({ id: j.id, sortOrder: i }))
    }
    // Optimistic
    mutate(
      (current: any) => {
        if (!current) return current
        const updated = [...current]
        for (const item of allItems) {
          const idx = updated.findIndex((j: any) => j.id === item.id)
          if (idx !== -1) updated[idx] = { ...updated[idx], sortOrder: item.sortOrder }
        }
        return updated
      },
      false
    )
    try {
      await reorderJobs(allItems)
      mutate()
    } catch (e) {
      console.error('Failed to sort by stage:', e)
      mutate()
    }
  }, [jobs, mutate])

  // Print
  const handlePrint = useCallback(() => {
    const filterText = activeFilter !== 'all'
      ? FILTER_TABS.find((t) => t.key === activeFilter)?.label || activeFilter
      : 'All Groups'

    const groupsHtml = PROD_GROUPS.map((group) => {
      const groupJobs = groupedJobs[group.key] || []
      if (activeFilter !== 'all' && activeFilter !== group.key) return ''
      if (groupJobs.length === 0) return ''

      const rows = groupJobs.map((job: any) => {
        const bp = stageToBuildProgress(job.stage)
        return `<tr>
          <td style="padding:5px 8px;font-weight:700;white-space:nowrap;">${job.num}</td>
          <td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${job.type || ''}</td>
          <td style="padding:5px 8px;"><span class="bp" style="border-color:${bp.color};color:${bp.color};">${bp.label}</span></td>
          <td style="padding:5px 8px;">${job.dealer || '-'}</td>
          <td style="padding:5px 8px;">${job.customer || '-'}</td>
          <td style="padding:5px 8px;font-weight:600;">${job.due || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.site || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.sheet || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.dwg || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.mrp || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.parts || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;text-transform:uppercase;font-weight:600;">${job.ebs || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;font-weight:600;">${(job as any).vass || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#777;">${job.notes || '-'}</td>
          <td style="padding:5px 8px;">${job.make || '-'}</td>
          <td style="padding:5px 8px;">${job.po || '-'}</td>
          <td style="padding:5px 8px;">${job.dims || '-'}</td>
          <td style="padding:5px 8px;font-size:10px;font-family:monospace;color:#888;">${job.vin || '-'}</td>
        </tr>`
      }).join('')

      return `<div class="group" style="page-break-inside:avoid;">
        <div class="group-header" style="background:${group.color};">
          ${group.label} <span class="count">${groupJobs.length}</span>
        </div>
        <table>
          <thead><tr>
            <th>Job No.</th><th>Type</th><th>Progress</th><th>Dealer</th><th>Customer</th><th>Due</th>
            <th>On Site</th><th>Sheet</th><th>DWG</th><th>MRP</th><th>Parts</th><th>EBS</th><th>VASS Engineering</th>
            <th>Notes</th><th>Make</th><th>PO</th><th>Dims</th><th>VIN</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>YLZ Job Board — Print</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 16px; font-size: 11px; }
    .header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 4px; }
    .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
    .header span { font-size: 11px; color: #666; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .meta { font-size: 11px; color: #666; margin-bottom: 16px; display: flex; gap: 16px; }
    .group { border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 14px; }
    .group-header { color: #fff; font-size: 12px; font-weight: 700; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; }
    .count { font-size: 10px; background: rgba(0,0,0,0.2); padding: 1px 8px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    thead th { background: #f5f5f5; font-size: 8px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; padding: 5px 8px; text-align: left; border-bottom: 1px solid #ddd; white-space: nowrap; }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .bp { font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 1px 6px; border-radius: 2px; border: 1px solid; }
    @media print {
      body { padding: 0; font-size: 10px; }
      @page { margin: 8mm; size: landscape; }
      .group { page-break-inside: avoid; }
      table { font-size: 9px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>YLZ</h1>
    <span>Job Board</span>
  </div>
  <div class="meta">
    <span>Printed: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    <span>Filter: ${filterText}</span>
    <span>${filteredJobs.length} job${filteredJobs.length !== 1 ? 's' : ''}</span>
  </div>
  ${groupsHtml}
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => { printWindow.print() }
    }
  }, [groupedJobs, filteredJobs, activeFilter])

  if (!jobs) {
    return (
      <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>
        Loading job board...
      </div>
    )
  }

  // Hidden file input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && expandedJob) {
      handleUpload(expandedJob, e.target.files)
    }
    e.target.value = ''
  }

  return (
    <div style={{ fontFamily: "'League Spartan', sans-serif" }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Page Header */}
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
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, lineHeight: 1 }}>
            JOB BOARD
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, letterSpacing: 0.3 }}>
            Manage jobs, drag between groups, upload files
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/job-master/next-number')
                const { jobNumber } = await res.json()
                setNewJob((prev: any) => ({ ...prev, num: jobNumber }))
              } catch {}
              setShowNewJobModal(true)
            }}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '10px 22px',
              borderRadius: 3,
              cursor: 'pointer',
              border: '1.5px solid rgba(255,255,255,0.12)',
              background: 'var(--btn-primary)',
              color: '#f7f7f7',
              minHeight: 40,
              whiteSpace: 'nowrap',
            }}
          >
            + New Job
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
              border: '1.5px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              transition: '0.15s',
              whiteSpace: 'nowrap',
              minHeight: 40,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            Print
          </button>
          <a
            href="https://ylztruckbodies-squad.monday.com/boards/1905554165"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              border: '1.5px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: '0.15s',
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
          >
            Monday.com &rarr;
          </a>
          {user?.fullAdmin && (
            <button
              onClick={handleSync}
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
                border: '1.5px solid #3b9de8',
                background: syncing ? 'rgba(59,157,232,0.15)' : 'transparent',
                color: '#3b9de8',
                whiteSpace: 'nowrap',
                transition: '0.15s',
                opacity: syncing ? 0.7 : 1,
                minHeight: 40,
              }}
              onMouseEnter={(e) => { if (!syncing) { e.currentTarget.style.background = '#3b9de8'; e.currentTarget.style.color = '#fff' } }}
              onMouseLeave={(e) => { if (!syncing) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3b9de8' } }}
            >
              {syncing ? 'Syncing...' : 'Sync Monday'}
            </button>
          )}
        </div>
      </div>

      {/* Sync result toast */}
      {syncResult && (
        <div
          style={{
            margin: '16px 28px 0',
            padding: '10px 16px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: syncResult.includes('failed') ? 'rgba(232,69,96,0.15)' : 'rgba(34,208,122,0.15)',
            border: `1px solid ${syncResult.includes('failed') ? '#e84560' : '#22d07a'}`,
            color: syncResult.includes('failed') ? '#e84560' : '#22d07a',
          }}
        >
          {syncResult}
        </div>
      )}

      {/* Job message toast */}
      {jobMessage && !showNewJobModal && (
        <div
          style={{
            margin: '16px 28px 0',
            padding: '10px 16px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: jobMessage.includes('Failed') ? 'rgba(232,69,96,0.15)' : 'rgba(34,208,122,0.15)',
            border: `1px solid ${jobMessage.includes('Failed') ? '#e84560' : '#22d07a'}`,
            color: jobMessage.includes('Failed') ? '#e84560' : '#22d07a',
          }}
        >
          {jobMessage}
        </div>
      )}

      <div style={{ padding: '20px 28px' }}>
        {/* Search + Filter Tabs + Stage Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'var(--dark3)',
              border: '1px solid var(--border2)',
              borderRadius: 4,
              color: '#fff',
              padding: '8px 12px',
              fontSize: 12,
              fontFamily: "'League Spartan', sans-serif",
              outline: 'none',
              width: 220,
            }}
          />
          <div style={{ display: 'flex', gap: 2 }}>
            {FILTER_TABS.map((tab) => {
              const active = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    padding: '6px 14px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    border: 'none',
                    background: active ? 'var(--btn-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text3)',
                    transition: '0.15s',
                  }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff' } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              background: 'var(--dark3)',
              border: '1px solid var(--border2)',
              borderRadius: 4,
              color: '#fff',
              padding: '8px 12px',
              fontSize: 12,
              fontFamily: "'League Spartan', sans-serif",
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={handleSortByStage}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 3,
              cursor: 'pointer',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text3)',
              transition: '0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
            title="Sort all jobs within each group by their build stage"
          >
            Sort by Stage
          </button>
          <button
            onClick={resetColWidths}
            style={{
              fontFamily: "'League Spartan', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 3,
              cursor: 'pointer',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text3)',
              transition: '0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
            title="Reset all column widths to default"
          >
            Reset Columns
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
              {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
            </span>
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--border2)', borderRadius: 4, overflow: 'hidden' }}>
              {(['table', 'kanban'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode)
                    try { localStorage.setItem('ylz-jobboard-view', mode) } catch {}
                  }}
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                    padding: '5px 12px', cursor: 'pointer', border: 'none',
                    background: viewMode === mode ? '#E8681A' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--text3)',
                    transition: '0.1s',
                  }}
                >
                  {mode === 'table' ? '≡ Table' : '⬜ Kanban'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <div style={{ display: 'flex', gap: 0, minHeight: 0, height: 'calc(100vh - 280px)', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowX: 'auto', paddingBottom: 8 }}>
              <KanbanView
                jobs={filteredJobs}
                userId={user?.id || ''}
                userName={user?.name || ''}
                onJobClick={(job) => setActivityJobId(job.id)}
              />
            </div>
            {/* Activity feed slide-in */}
            {activityJobId && (() => {
              const aJob = (jobs as any[])?.find((j: any) => j.id === activityJobId)
              return (
                <div style={{
                  width: 360, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.1)',
                  background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{aJob?.num}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aJob?.customer}</span>
                    <button onClick={() => setActivityJobId(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <JobActivityFeed
                      jobId={activityJobId}
                      jobNum={aJob?.num || ''}
                      userId={user?.id || ''}
                      userName={user?.name || ''}
                      userColor={user?.color || '#E8681A'}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Grouped Tables with DnD */}
        {viewMode === 'table' && <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PROD_GROUPS.map((group) => {
              const groupJobs = groupedJobs[group.key] || []
              const isCollapsed = collapsed[group.key] || false
              const isOverThis = overGroupId === group.key && activeId !== null

              if (activeFilter !== 'all' && activeFilter !== group.key) return null

              return (
                <div
                  key={group.key}
                  style={{
                    border: isOverThis ? '2px solid rgba(59,157,232,0.6)' : '1px solid var(--border)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    transition: 'border 0.15s',
                  }}
                >
                  {/* Group Header */}
                  <div
                    onClick={() => toggleCollapse(group.key)}
                    style={{
                      background: group.color,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      userSelect: 'none',
                      fontFamily: "'League Spartan', sans-serif",
                      letterSpacing: 0.5,
                    }}
                  >
                    <span>
                      {isCollapsed ? '\u25B6' : '\u25BC'} {group.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(0,0,0,0.25)', padding: '2px 10px', borderRadius: 10 }}>
                      {groupJobs.length}
                    </span>
                  </div>

                  {/* Table */}
                  {!isCollapsed && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}>
                        <colgroup>
                          {colWidths.map((w, i) => (
                            <col key={i} style={{ width: w, minWidth: 30 }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            {TABLE_COLUMNS.map((col, i) => (
                              <th
                                key={i}
                                style={{
                                  position: 'relative',
                                  background: 'var(--dark3)',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: 1,
                                  textTransform: 'uppercase',
                                  color: 'var(--text3)',
                                  padding: '8px 10px',
                                  textAlign: 'left',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  borderBottom: '1px solid var(--border)',
                                  fontFamily: "'League Spartan', sans-serif",
                                  ...(i === 0 ? { padding: '8px 4px 8px 10px' } : {}),
                                }}
                              >
                                {col}
                                {/* Resize handle — skip for first column (drag handle) */}
                                {i > 0 && (
                                  <div
                                    onMouseDown={(e) => onResizeStart(i, e)}
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: 6,
                                      cursor: 'col-resize',
                                      background: 'transparent',
                                      zIndex: 2,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,157,232,0.5)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                                  />
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <SortableContext items={groupJobs.map((j: any) => j.id)} strategy={verticalListSortingStrategy}>
                        <DroppableGroup id={group.key}>
                          {groupJobs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={TABLE_COLUMNS.length}
                                style={{
                                  padding: '16px 14px',
                                  color: 'var(--text3)',
                                  fontSize: 11,
                                  textAlign: 'center',
                                  background: 'var(--dark2)',
                                }}
                              >
                                {activeId ? 'Drop job here' : 'No jobs in this group'}
                              </td>
                            </tr>
                          ) : (
                            groupJobs.map((job: any) => (
                              <DraggableJobRow
                                key={job.id}
                                job={job}
                                user={user}
                                checklist={checklistMap[job.id] || null}
                                isExpanded={expandedJob === job.id}
                                onToggleExpand={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                                onAdvance={handleAdvance}
                                onDelete={(id, num) => setDeleteConfirm({ id, num })}
                                onFieldSave={handleFieldSave}
                                fileCount={(filesByJob[job.id] || []).length}
                                jobFiles={filesByJob[job.id] || []}
                                fileInputRef={fileInputRef}
                                uploading={uploading}
                                onUpload={handleUpload}
                                onDeleteFile={handleDeleteFile}
                                onFileDrop={handleFileDrop}
                                dragOverFile={dragOverJob}
                                setDragOverFile={setDragOverJob}
                                onContextMenu={(e, j) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, jobId: j.id, job: j }) }}
                              />
                            ))
                          )}
                        </DroppableGroup>
                        </SortableContext>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId ? (
              <div
                style={{
                  background: 'var(--dark2)',
                  border: '2px solid #3b9de8',
                  borderRadius: 4,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  fontFamily: "'League Spartan', sans-serif",
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {(jobs as any[])?.find((j: any) => j.id === activeId)?.num || 'Moving...'}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>}
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <div
          onClick={() => setShowNewJobModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 28,
              width: 480,
              maxWidth: '90vw',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1.5, marginBottom: 20 }}>
              NEW JOB
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Job Number *</label>
                <input
                  type="text"
                  placeholder="e.g. YLZ1080"
                  value={newJob.num}
                  onChange={(e) => setNewJob({ ...newJob, num: e.target.value })}
                  style={modalInputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Body/Trailer Type</label>
                <input
                  type="text"
                  placeholder="e.g. Hardox Tipper Body"
                  value={newJob.type}
                  onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                  style={modalInputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Customer</label>
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={newJob.customer}
                    onChange={(e) => setNewJob({ ...newJob, customer: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Dealer</label>
                  <input
                    type="text"
                    placeholder="Dealer name"
                    value={newJob.dealer}
                    onChange={(e) => setNewJob({ ...newJob, dealer: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Due Date</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yy"
                    value={newJob.due}
                    onChange={(e) => setNewJob({ ...newJob, due: e.target.value })}
                    style={modalInputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Production Group</label>
                  <select
                    value={newJob.prodGroup}
                    onChange={(e) => setNewJob({ ...newJob, prodGroup: e.target.value })}
                    style={modalInputStyle}
                  >
                    {PROD_GROUPS.map((g) => (
                      <option key={g.key} value={g.key}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Purchase Order</label>
                <div
                  onClick={() => poInputRef.current?.click()}
                  style={{
                    ...modalInputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    color: poFile ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {poFile ? (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{poFile.name}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); setPoFile(null); if (poInputRef.current) poInputRef.current.value = '' }}
                        style={{ color: '#e84560', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                      >
                        &times;
                      </span>
                    </>
                  ) : (
                    'Click to attach PO (PDF, image, etc.)'
                  )}
                </div>
                <input
                  ref={poInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files?.[0]) setPoFile(e.target.files[0]) }}
                />
              </div>
            </div>

            {jobMessage && showNewJobModal && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: jobMessage.includes('Failed') || jobMessage.includes('required') ? '#e84560' : '#22d07a' }}>
                {jobMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewJobModal(false); setPoFile(null) }}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '10px 22px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1.5px solid var(--border2)',
                  background: 'transparent',
                  color: 'var(--text2)',
                  minHeight: 40,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                disabled={savingJob}
                style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: '10px 22px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'var(--btn-primary)',
                  color: '#f7f7f7',
                  minHeight: 40,
                }}
              >
                {savingJob ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          {/* Transparent overlay — click anywhere outside menu to close */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              zIndex: 1000,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '6px 0',
            minWidth: 240,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            fontSize: 13,
          }}
        >
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            {contextMenu.job.num} — Move to Group
          </div>
          {PROD_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => handleMoveGroup(contextMenu.jobId, g.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                color: contextMenu.job.prodGroup === g.key ? '#fff' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
              {g.label}
              {contextMenu.job.prodGroup === g.key && <span style={{ marginLeft: 'auto', color: '#E8681A', fontSize: 12 }}>✓</span>}
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
          <div style={{ padding: '4px 14px 8px', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
            Move to Stage
          </div>
          {STAGES.map((s) => {
            const info = stageToBuildProgress(s)
            return (
              <button
                key={s}
                onClick={() => handleMoveStage(contextMenu.jobId, s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                  color: contextMenu.job.stage === s ? '#fff' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                {s}
                {contextMenu.job.stage === s && <span style={{ marginLeft: 'auto', color: '#E8681A', fontSize: 12 }}>✓</span>}
              </button>
            )
          })}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--dark2)', border: '1px solid rgba(255,80,80,0.3)',
              borderRadius: 8, padding: '32px 36px', maxWidth: 420, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>🗑</div>
            <h2 style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
              Delete Job {deleteConfirm.num}?
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 28 }}>
              This will permanently delete job <strong style={{ color: '#fff' }}>{deleteConfirm.num}</strong> and all associated data.
              <br /><br />
              <strong style={{ color: 'rgba(255,80,80,0.9)' }}>This cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase', padding: '10px 20px',
                  borderRadius: 5, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent', color: 'rgba(255,255,255,0.5)',
                }}
              >
                No, Cancel
              </button>
              <button
                onClick={() => handleDeleteJob(deleteConfirm.id)}
                style={{
                  fontFamily: "'League Spartan', sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase', padding: '10px 20px',
                  borderRadius: 5, cursor: 'pointer',
                  border: '1px solid rgba(255,80,80,0.5)', background: 'rgba(255,80,80,0.15)', color: '#ff5050',
                }}
              >
                Yes, Delete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--text3)',
  marginBottom: 6,
  display: 'block',
}

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--dark3)',
  border: '1px solid var(--border2)',
  borderRadius: 4,
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  minHeight: 44,
  fontFamily: "'League Spartan', sans-serif",
}
