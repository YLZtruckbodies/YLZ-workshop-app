import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const dates = searchParams.get('dates')
  const where: any = {}
  if (dates) {
    where.date = { in: dates.split(',') }
  } else if (date) {
    where.date = date
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(timesheets)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Bulk entries (day blocks)
  if (body.entries && Array.isArray(body.entries)) {
    const results = []

    // If submitting leave/sick, clear any existing work entries for this worker+date first
    const firstEntry = body.entries[0]
    if (firstEntry && (firstEntry.startTime === 'LEAVE' || firstEntry.startTime === 'SICK')) {
      await prisma.timesheet.deleteMany({
        where: { workerName: firstEntry.workerName, date: firstEntry.date },
      })
    } else if (firstEntry) {
      // If submitting work entries, clear any leave/sick entry first
      await prisma.timesheet.deleteMany({
        where: {
          workerName: firstEntry.workerName,
          date: firstEntry.date,
          startTime: { in: ['LEAVE', 'SICK'] },
        },
      })
    }

    for (const entry of body.entries) {
      // Upsert: find existing entry for this worker + date + section (block key)
      const existing = await prisma.timesheet.findFirst({
        where: {
          workerName: entry.workerName,
          date: entry.date,
          section: entry.section,
        },
      })

      if (existing) {
        const updated = await prisma.timesheet.update({
          where: { id: existing.id },
          data: {
            jobNum: entry.jobNum,
            workSection: entry.workSection || '',
            startTime: entry.startTime,
            endTime: entry.endTime,
            hours: entry.hours,
            createdBy: entry.createdBy,
          },
        })
        results.push(updated)
      } else {
        const created = await prisma.timesheet.create({ data: entry })
        results.push(created)
      }
    }
    return NextResponse.json(results, { status: 201 })
  }

  // Single entry (backwards compat)
  const ts = await prisma.timesheet.create({ data: body })
  return NextResponse.json(ts, { status: 201 })
}
