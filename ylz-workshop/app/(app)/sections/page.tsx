'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useJobs, useWorkers } from '@/lib/hooks'

const SECTIONS_DATA = [
  { name: 'Hardox/Steel Fab', color: '#e2e2e2', team: 'Rav, JD', stageFilter: 'Fab', typeFilter: 'hardox' },
  { name: 'Alloy Fabrication', color: '#3b9de8', team: 'Darwin, Julio, Ben', stageFilter: 'Fab', typeFilter: 'ally' },
  { name: 'Truck Chassis/Subframes', color: '#22d07a', team: 'Herson, Rob, Andres, Dennis, Kabaj, Mohit', stageFilter: 'Fab', typeFilter: null },
  { name: 'Trailer Chassis', color: '#a78bfa', team: 'Kabaj, Mohit', stageFilter: 'Fab', typeFilter: 'trailer' },
  { name: 'Paint Bay 1', color: '#f5a623', team: 'Tony, Emma', stageFilter: 'Paint', typeFilter: null },
  { name: 'Paint Bay 2', color: '#f5a623', team: 'Tony, Emma', stageFilter: 'Paint', typeFilter: null },
  { name: 'Paint Bay 3', color: '#f5a623', team: 'Tony, Emma', stageFilter: 'Paint', typeFilter: null },
  { name: 'Fitout Bodies', color: '#8aaec6', team: 'Bailey, Dan', stageFilter: 'Fitout', typeFilter: 'body' },
  { name: 'Fitout Trailer Chassis', color: '#a78bfa', team: 'Mark, Arvi', stageFilter: 'Fitout', typeFilter: 'trailer' },
  { name: 'Fitout Subframes', color: '#e2e2e2', team: 'Nathan', stageFilter: 'Fitout', typeFilter: null },
  { name: 'QC', color: '#9b6dff', team: 'Matt', stageFilter: 'QC', typeFilter: null },
]

const SECTION_FILTER_MAP: Record<string, string> = {
  QC: 'QC',
  Alloy: 'Alloy Fabrication',
  Steel: 'Hardox/Steel Fab',
}

interface CheckItem {
  text: string
  checked: boolean
}

export default function SectionsPage() {
  const { data: session } = useSession()
  const { data: jobs } = useJobs()
  const [checklists, setChecklists] = useState<Record<string, CheckItem[]>>(() => {
    const init: Record<string, CheckItem[]> = {}
    SECTIONS_DATA.forEach((s) => {
      init[s.name] = [
        { text: 'Area clean and organised', checked: false },
        { text: 'Tools accounted for', checked: false },
        { text: 'Safety equipment checked', checked: false },
        { text: 'Job sheets up to date', checked: false },
        { text: 'Materials stocked', checked: false },
      ]
    })
    return init
  })

  const userSection = session?.user?.section
  let filteredSections = SECTIONS_DATA
  if (userSection && SECTION_FILTER_MAP[userSection]) {
    filteredSections = SECTIONS_DATA.filter((s) => s.name === SECTION_FILTER_MAP[userSection])
  }

  function getJobsForSection(section: typeof SECTIONS_DATA[0]) {
    if (!jobs) return []
    return jobs.filter((j: any) => {
      if (j.stage !== section.stageFilter) return false
      if (section.typeFilter) {
        const t = j.type.toLowerCase()
        return t.includes(section.typeFilter)
      }
      return true
    })
  }

  function toggleCheck(sectionName: string, idx: number) {
    setChecklists((prev) => {
      const items = [...prev[sectionName]]
      items[idx] = { ...items[idx], checked: !items[idx].checked }
      return { ...prev, [sectionName]: items }
    })
  }

  return (
    <div>
      <div
        style={{
          padding: '22px 28px 16px',
          borderBottom: '1px solid var(--border)',
          background: '#000',
        }}
      >
        <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
          WORKSHOP SECTIONS
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          Section overview and daily checklists
          {userSection && (
            <span style={{ color: 'var(--accent)', marginLeft: 8 }}>
              Filtered: {userSection}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {filteredSections.map((section) => {
            const sectionJobs = getJobsForSection(section)
            const checks = checklists[section.name] || []
            const doneCount = checks.filter((c) => c.checked).length
            const progress = checks.length ? Math.round((doneCount / checks.length) * 100) : 0

            return (
              <div
                key={section.name}
                style={{
                  background: 'var(--dark2)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '14px 16px',
                  transition: '0.18s',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: section.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1 }}>
                    {section.name}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10 }}>
                  {section.team}
                </div>

                {/* Active Jobs */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {sectionJobs.slice(0, 6).map((j: any) => (
                    <span
                      key={j.id}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 2,
                        background: 'rgba(226,226,226,0.10)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                      }}
                    >
                      {j.num}
                    </span>
                  ))}
                  {sectionJobs.length === 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>No active jobs</span>
                  )}
                </div>

                {/* Checklist */}
                <div style={{ marginBottom: 10 }}>
                  {checks.map((item, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 0',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: item.checked ? 'var(--green)' : 'var(--text2)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleCheck(section.name, idx)}
                        style={{ accentColor: 'var(--green)', width: 14, height: 14 }}
                      />
                      <span
                        style={{
                          textDecoration: item.checked ? 'line-through' : 'none',
                          opacity: item.checked ? 0.6 : 1,
                        }}
                      >
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Progress */}
                <div>
                  <div
                    style={{
                      height: 3,
                      background: 'var(--dark4)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 2,
                        background: 'var(--green)',
                        width: `${progress}%`,
                        transition: '0.3s',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {doneCount}/{checks.length} complete
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{progress}%</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
