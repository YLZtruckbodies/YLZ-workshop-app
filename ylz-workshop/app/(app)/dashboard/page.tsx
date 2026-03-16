'use client'

import { useSession } from 'next-auth/react'
import { useJobs } from '@/lib/hooks'
import { parseDate } from '@/lib/workdays'
import { useMemo } from 'react'

const STAGE_COLORS: Record<string, string> = {
  'Requires Engineering': '#f97316',
  'Ready to Start': '#06b6d4',
  Fab: '#3b9de8',
  Paint: '#a259ff',
  Fitout: '#f5a623',
  QC: '#3b9de8',
  Dispatch: '#22d07a',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { data: jobs, mutate } = useJobs()
  const user = session?.user as any

  const activeJobs = useMemo(() => {
    if (!jobs) return []
    return jobs.filter((j: any) => j.stage !== 'Dispatch')
  }, [jobs])

  const fabCount = useMemo(() => {
    if (!jobs) return 0
    return jobs.filter((j: any) => j.stage === 'Fab').length
  }, [jobs])

  const fitoutCount = useMemo(() => {
    if (!jobs) return 0
    return jobs.filter((j: any) => j.stage === 'Fitout').length
  }, [jobs])

  const dispatchCount = useMemo(() => {
    if (!jobs) return 0
    return jobs.filter((j: any) => j.stage === 'Dispatch').length
  }, [jobs])

  const deliveryJobs = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter((j: any) => j.due && j.due.trim() !== '')
      .sort((a: any, b: any) => {
        const da = parseDate(a.due)
        const db = parseDate(b.due)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        return da.getTime() - db.getTime()
      })
  }, [jobs])

  if (!jobs) {
    return (
      <div style={{ padding: 32, color: 'var(--text3)', fontSize: 14 }}>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'League Spartan', sans-serif" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
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
          DASHBOARD
        </h1>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text3)',
            marginTop: 4,
            letterSpacing: 0.3,
          }}
        >
          Production overview &middot; YLZ Truck Bodies
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          accentColor="var(--accent)"
        />
        <StatCard
          label="In Fabrication"
          value={fabCount}
          accentColor="var(--blue)"
        />
        <StatCard
          label="In Fitout"
          value={fitoutCount}
          accentColor="var(--amber)"
        />
        <StatCard
          label="Dispatched This Week"
          value={dispatchCount}
          accentColor="var(--green)"
        />
      </div>

      {/* Delivery Schedule */}
      <div>
        <h2
          style={{
            fontFamily: "'League Spartan', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 14px 0',
            letterSpacing: 1.5,
          }}
        >
          DELIVERY SCHEDULE
        </h2>

        {deliveryJobs.length === 0 ? (
          <div
            style={{
              color: 'var(--text3)',
              fontSize: 12,
              padding: '12px 0',
            }}
          >
            No jobs with due dates set.
          </div>
        ) : (
          <div
            style={{
              background: 'var(--dark2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 1fr 100px 90px',
                gap: 0,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--dark3)',
              }}
            >
              {['Job No', 'Type', 'Customer', 'Due Date', 'Stage'].map(
                (h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      color: 'var(--text3)',
                    }}
                  >
                    {h}
                  </div>
                )
              )}
            </div>

            {/* Table Rows */}
            {deliveryJobs.map((job: any) => (
              <div
                key={job.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 1fr 100px 90px',
                  gap: 0,
                  padding: '9px 16px',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.12s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div
                  style={{
                    fontFamily: "'League Spartan', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: 0.5,
                  }}
                >
                  {job.num}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text2)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {job.type}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text3)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {job.customer}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {job.due}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: `${STAGE_COLORS[job.stage] || 'var(--text3)'}22`,
                      color: STAGE_COLORS[job.stage] || 'var(--text3)',
                      border: `1px solid ${STAGE_COLORS[job.stage] || 'var(--text3)'}44`,
                    }}
                  >
                    {job.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  accentColor,
}: {
  label: string
  value: number
  accentColor: string
}) {
  return (
    <div
      style={{
        background: 'var(--dark2)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '16px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accentColor,
        }}
      />
      <div
        style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 38,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }}
      >
        {label}
      </div>
    </div>
  )
}
