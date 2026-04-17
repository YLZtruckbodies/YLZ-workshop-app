import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseAusDate(d: string): Date {
  const [day, month, year] = d.split('/')
  return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day))
}

function getWeekMonday(d: string): string {
  const dt = parseAusDate(d)
  const dayOfWeek = dt.getDay() || 7
  dt.setDate(dt.getDate() - dayOfWeek + 1)
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear().toString().slice(-2)}`
}

// Per-worker, per-job hours: { workerName: { jobNum: hours } }
function buildWorkerJobHours(timesheets: any[], jobNumLookup: Record<string, string>) {
  const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase()
  const result: Record<string, Record<string, number>> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    const w = t.workerName
    const jobNum = jobNumLookup[normalize(t.jobNum)] || t.jobNum
    if (!result[w]) result[w] = {}
    result[w][jobNum] = (result[w][jobNum] || 0) + t.hours
  }
  return result
}

// Per-worker, per-week hours: { workerName: { weekKey: { total, ot } } }
function buildWorkerWeeklyHours(timesheets: any[]) {
  const result: Record<string, Record<string, { total: number; ot: number; days: Set<string> }>> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    const w = t.workerName
    const weekKey = getWeekMonday(t.date)
    if (!result[w]) result[w] = {}
    if (!result[w][weekKey]) result[w][weekKey] = { total: 0, ot: 0, days: new Set() }
    result[w][weekKey].total += t.hours
    result[w][weekKey].days.add(t.date)
    if (t.section === 'overtime' || t.section === 'early_ot') {
      result[w][weekKey].ot += t.hours
    }
  }
  // Convert Sets to counts for JSON
  const out: Record<string, Record<string, { total: number; ot: number; days: number }>> = {}
  for (const w in result) {
    out[w] = {}
    for (const wk in result[w]) {
      out[w][wk] = { total: Math.round(result[w][wk].total * 10) / 10, ot: Math.round(result[w][wk].ot * 10) / 10, days: result[w][wk].days.size }
    }
  }
  return out
}

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

  // Hours per job per section (workSection breakdown)
  const jobSectionMap: Record<string, Record<string, { hours: number; workers: Record<string, number> }>> = {}
  for (const t of timesheets) {
    if (t.startTime === 'LEAVE' || t.startTime === 'SICK') continue
    const normed = normalize(t.jobNum)
    const jobNum = jobNumLookup[normed] || t.jobNum
    const ws = t.workSection || 'other'
    if (!jobSectionMap[jobNum]) jobSectionMap[jobNum] = {}
    if (!jobSectionMap[jobNum][ws]) jobSectionMap[jobNum][ws] = { hours: 0, workers: {} }
    jobSectionMap[jobNum][ws].hours += t.hours
    jobSectionMap[jobNum][ws].workers[t.workerName] = (jobSectionMap[jobNum][ws].workers[t.workerName] || 0) + t.hours
  }

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
    jobSectionBreakdown: jobSectionMap,
    workerJobHours: buildWorkerJobHours(timesheets, jobNumLookup),
    workerWeeklyHours: buildWorkerWeeklyHours(timesheets),
    workerHours,
    sectionHours,
    dailyHours,
    stageCount,
  })
}
