'use client'

import { useEffect, useState } from 'react'
import { STAGE_COLORS } from '@/lib/constants'

interface StageItem { stage: string; count: number }
interface WorkerItem { id: string; name: string; section: string; color: string; jobCount: number }
interface WorkloadData { stageBreakdown: StageItem[]; workerLoad: WorkerItem[]; totalHours: number; weeksBooked: number }

export default function WorkloadPage() {
  const [data, setData] = useState<WorkloadData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workload')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const maxStageCount = data ? Math.max(...data.stageBreakdown.map(s => s.count), 1) : 1
  const maxWorkerCount = data ? Math.max(...data.workerLoad.map(w => w.jobCount), 1) : 1

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>
          Workload
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          Active job distribution across production stages and workers
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
      ) : (
        <>
        {/* Capacity banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderTop: '3px solid #E8681A', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#E8681A', fontFamily: "'League Spartan', sans-serif" }}>
              {data?.stageBreakdown.reduce((s, i) => s + i.count, 0) ?? 0}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4 }}>
              Active Jobs
            </div>
          </div>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderTop: '3px solid #3b9de8', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#3b9de8', fontFamily: "'League Spartan', sans-serif" }}>
              {data?.totalHours ?? 0}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4 }}>
              Est. Hours in Queue
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Based on estimated hours per job</div>
          </div>
          <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderTop: `3px solid ${(data?.weeksBooked ?? 0) > 8 ? '#ef4444' : (data?.weeksBooked ?? 0) > 4 ? '#f59e0b' : '#22c55e'}`, borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: (data?.weeksBooked ?? 0) > 8 ? '#ef4444' : (data?.weeksBooked ?? 0) > 4 ? '#f59e0b' : '#22c55e', fontFamily: "'League Spartan', sans-serif" }}>
              {data?.weeksBooked ?? 0} wks
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4 }}>
              Booked Out
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>@ 35 hrs/week capacity</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Stage Breakdown */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }}>
              By Production Stage
            </h2>
            <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data?.stageBreakdown.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 12 }}>No active jobs</div>
              )}
              {data?.stageBreakdown.map(s => {
                const color = STAGE_COLORS[s.stage] || '#888'
                const pct = (s.count / maxStageCount) * 100
                return (
                  <div key={s.stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{s.stage}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'League Spartan', sans-serif" }}>
                        {s.count}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 4,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stage cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 }}>
              {data?.stageBreakdown.map(s => {
                const color = STAGE_COLORS[s.stage] || '#888'
                return (
                  <div key={s.stage} style={{
                    background: 'var(--dark2)',
                    border: `1px solid ${color}44`,
                    borderTop: `3px solid ${color}`,
                    borderRadius: 8,
                    padding: '14px 16px',
                  }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'League Spartan', sans-serif" }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--text3)', marginTop: 4 }}>
                      {s.stage}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Worker Load */}
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }}>
              By Worker
            </h2>
            <div style={{ background: 'var(--dark2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {data?.workerLoad.filter(w => w.jobCount > 0).length === 0 && (
                <div style={{ padding: 20, color: 'var(--text3)', fontSize: 12 }}>No worker assignments</div>
              )}
              {data?.workerLoad.map(w => {
                const pct = (w.jobCount / maxWorkerCount) * 100
                const isHigh = pct > 80
                return (
                  <div key={w.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: w.color || '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {w.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{w.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isHigh ? '#ef4444' : 'var(--text3)' }}>
                          {w.jobCount} job{w.jobCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{w.section}</div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: isHigh ? '#ef4444' : w.color || '#E8681A',
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
