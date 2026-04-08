import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [timesheets, jobs, workers] = await Promise.all([
    prisma.timesheet.findMany(),
    prisma.job.findMany(),
    prisma.worker.findMany(),
  ])

  // Normalize job number: strip spaces, uppercase
  const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase()

  // Build a lookup from normalized job num -> actual job num in DB
  const jobNumLookup: Record<string, string> = {}
  for (const j of jobs) {
    jobNumLookup[normalize(j.num)] = j.num
  }

  // Hours per job (normalize timesheet job nums to match DB jobs)
  const jobHoursMap: Record<string, number> = {}
  const unmatchedHoursMap: Record<string, number> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    const normed = normalize(t.jobNum)
    const matched = jobNumLookup[normed]
    if (matched) {
      jobHoursMap[matched] = (jobHoursMap[matched] || 0) + t.hours
    } else {
      unmatchedHoursMap[t.jobNum] = (unmatchedHoursMap[t.jobNum] || 0) + t.hours
    }
  }

  const jobHours = jobs
    .map((j: any) => ({
      jobNum: j.num,
      type: j.type,
      stage: j.stage,
      customer: j.customer,
      prodGroup: j.prodGroup,
      hours: jobHoursMap[j.num] || 0,
    }))
    .sort((a: any, b: any) => b.hours - a.hours)

  // Include unmatched ad-hoc entries so no hours are invisible
  // Label special codes properly, rest as Ad-hoc
  const SPECIAL_CODE_LABELS: Record<string, string> = {
    'NON-PRODUCTIVE': 'Non Productive',
    'STOCK-PARTS': 'Stock Parts',
  }

  const unmatchedJobs = Object.entries(unmatchedHoursMap)
    .map(([jobNum, hours]) => ({
      jobNum,
      type: SPECIAL_CODE_LABELS[jobNum] || 'Ad-hoc',
      stage: '',
      customer: '',
      prodGroup: '',
      hours,
    }))
    .sort((a: any, b: any) => b.hours - a.hours)

  const allJobHours = [...jobHours, ...unmatchedJobs].sort((a: any, b: any) => b.hours - a.hours)

  // Hours per worker
  const workerHoursMap: Record<string, number> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    workerHoursMap[t.workerName] = (workerHoursMap[t.workerName] || 0) + t.hours
  }

  const workerHours = workers.map((w: any) => ({
    name: w.name,
    section: w.section,
    color: w.color,
    hours: workerHoursMap[w.name] || 0,
  })).sort((a: any, b: any) => b.hours - a.hours)

  // Hours per section
  const sectionHoursMap: Record<string, number> = {}
  const workerSectionMap: Record<string, string> = {}
  for (const w of workers) {
    workerSectionMap[w.name] = w.section
  }
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    const sec = workerSectionMap[t.workerName] || 'other'
    sectionHoursMap[sec] = (sectionHoursMap[sec] || 0) + t.hours
  }

  const sectionHours = Object.entries(sectionHoursMap)
    .map(([section, hours]: any) => ({ section, hours }))
    .sort((a: any, b: any) => b.hours - a.hours)

  // Hours per day (last 14 days of data)
  const dailyHoursMap: Record<string, number> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    dailyHoursMap[t.date] = (dailyHoursMap[t.date] || 0) + t.hours
  }
  const dailyHours = Object.entries(dailyHoursMap)
    .map(([date, hours]: any) => ({ date, hours }))
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(-14)

  // Stage distribution
  const stageCount: Record<string, number> = {}
  const activeJobs = jobs.filter((j: any) => j.prodGroup === 'issued' || j.prodGroup === 'goahead')
  for (const j of activeJobs) {
    stageCount[j.stage] = (stageCount[j.stage] || 0) + 1
  }

  // Totals
  const totalHours = Object.values(jobHoursMap).reduce((a: any, b: any) => a + b, 0)
    + Object.values(unmatchedHoursMap).reduce((a: any, b: any) => a + b, 0)
  const nearComplete = jobs.filter((j: any) => j.stage === 'QC' || j.stage === 'Dispatch').length

  // Leave/sick today
  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`
  const todayEntries = timesheets.filter((t: any) => t.date === todayStr)
  const onLeave = todayEntries.filter((t: any) => t.startTime === 'LEAVE').map((t: any) => t.workerName)
  const onSick = todayEntries.filter((t: any) => t.startTime === 'SICK').map((t: any) => t.workerName)
  const workingToday = new Set(todayEntries.filter((t: any) => t.startTime !== 'LEAVE' && t.startTime !== 'SICK').map((t: any) => t.workerName)).size

  return NextResponse.json({
    totalHours: Math.round(totalHours * 100) / 100,
    activeJobsCount: activeJobs.length,
    nearCompleteCount: nearComplete,
    workersToday: workingToday,
    onLeave,
    onSick,
    jobHours: allJobHours,
    workerHours,
    sectionHours,
    dailyHours,
    stageCount,
  })
}
