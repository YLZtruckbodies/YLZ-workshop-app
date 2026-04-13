'use client'

import { useState } from 'react'
import { STAGES, stageToBuildProgress } from '@/lib/jobTypes'
import { moveJobStage } from '@/lib/hooks'
import { mutate } from 'swr'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

interface Job {
  id: string
  num: string
  type: string
  customer: string
  stage: string
  flag: boolean
  due: string
  btype: string
  prodGroup: string
}

interface Props {
  jobs: Job[]
  userId: string
  userName: string
  onJobClick: (job: Job) => void
}

const PROD_GROUP_COLORS: Record<string, string> = {
  issued: '#e84560',
  goahead: '#3b9de8',
  pending: '#f5a623',
  stock: '#22d07a',
  finished: '#22d07a',
}

function KanbanCard({ job, onJobClick }: { job: Job; onJobClick: (j: Job) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id })
  const pgColor = PROD_GROUP_COLORS[job.prodGroup] || 'rgba(255,255,255,0.2)'

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onJobClick(job)}
      style={{
        background: isDragging ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isDragging ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderLeft: `3px solid ${pgColor}`,
        borderRadius: 6,
        padding: '10px 12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        transition: 'background 0.1s',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#E8681A' }}>{job.num}</span>
        {job.flag && <span style={{ fontSize: 11 }}>🚩</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          {job.due ? job.due : ''}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {job.customer || '—'}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {job.type}
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  jobs,
  isOver,
  onJobClick,
}: {
  stage: string
  jobs: Job[]
  isOver: boolean
  onJobClick: (j: Job) => void
}) {
  const { setNodeRef } = useDroppable({ id: stage })
  const { label, color } = stageToBuildProgress(stage)

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 210,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: isOver ? 'rgba(232,104,26,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isOver ? 'rgba(232,104,26,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'background 0.15s, border 0.15s',
        minHeight: 200,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 0.5, flex: 1 }}>{label}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, background: `${color}22`, color,
          borderRadius: 10, padding: '1px 7px', border: `1px solid ${color}44`,
        }}>
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} onJobClick={onJobClick} />
        ))}
        {jobs.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>
            Empty
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanView({ jobs, userId, userName, onJobClick }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const jobsByStage: Record<string, Job[]> = {}
  STAGES.forEach((s) => { jobsByStage[s] = [] })
  jobs.forEach((j) => {
    if (jobsByStage[j.stage]) jobsByStage[j.stage].push(j)
    else jobsByStage[j.stage] = [j]
  })

  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragOver(e: DragOverEvent) {
    const overId = e.over?.id as string | undefined
    if (overId && STAGES.includes(overId as any)) {
      setOverStage(overId)
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    setOverStage(null)
    const { active, over } = e
    if (!over) return
    const targetStage = over.id as string
    if (!STAGES.includes(targetStage as any)) return
    const job = jobs.find((j) => j.id === active.id)
    if (!job || job.stage === targetStage) return

    // Optimistic update
    mutate('/api/jobs', (current: any) => {
      if (!Array.isArray(current)) return current
      return current.map((j: Job) => j.id === job.id ? { ...j, stage: targetStage } : j)
    }, false)

    try {
      await moveJobStage(job.id, targetStage, userId, userName)
      mutate('/api/jobs')
    } catch {
      mutate('/api/jobs')
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start', minHeight: 0 }}>
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            jobs={jobsByStage[stage] || []}
            isOver={overStage === stage}
            onJobClick={onJobClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeJob && (
          <div style={{
            background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(232,104,26,0.6)',
            borderLeft: '3px solid #E8681A', borderRadius: 6, padding: '10px 12px',
            width: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E8681A', marginBottom: 4 }}>{activeJob.num}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{activeJob.customer}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{activeJob.type}</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
