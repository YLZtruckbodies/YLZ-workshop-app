import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const date = searchParams.get('date')

  const worker = searchParams.get('worker')

  const where: any = {}
  if (from && to) {
    where.date = { gte: from, lte: to }
  } else if (date) {
    where.date = date
  }
  if (worker) {
    where.workerName = { contains: worker, mode: 'insensitive' }
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    orderBy: [{ date: 'asc' }, { workerName: 'asc' }, { createdAt: 'asc' }],
  })

  const SECTION_LABELS: Record<string, string> = {
    alloy: 'Alloy Fabrication',
    hardox: 'Hardox / Steel Fab',
    chassis: 'Chassis',
    fitout: 'Fitout',
    trailerfit: 'Trailer Fitout',
    subfit: 'Subframe Fitout',
    paint: 'Paint',
  }

  const header = 'Date,Worker,Job Number,Block,Work Section,Start Time,End Time,Hours'
  const rows = timesheets.map(
    (t: any) => `${t.date},${esc(t.workerName)},${esc(t.jobNum)},${esc(t.section)},${esc(SECTION_LABELS[t.workSection] || t.workSection || '')},${t.startTime},${t.endTime},${t.hours}`
  )
  const csv = [header, ...rows].join('\n')

  const label = (worker ? `${worker}-` : '') + (from && to ? `${from}_to_${to}` : date || 'all')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timesheet-${label}.csv"`,
    },
  })
}

function esc(val: string): string {
  if (val.includes(',') || val.includes('"')) return `"${val.replace(/"/g, '""')}"`
  return val
}

export async function POST(req: NextRequest) {
  const { date } = await req.json()

  const timesheets = await prisma.timesheet.findMany({
    where: date ? { date } : {},
    orderBy: { createdAt: 'asc' },
  })

  const SECTION_LABELS: Record<string, string> = {
    alloy: 'Alloy Fabrication',
    hardox: 'Hardox / Steel Fab',
    chassis: 'Chassis',
    fitout: 'Fitout',
    trailerfit: 'Trailer Fitout',
    subfit: 'Subframe Fitout',
    paint: 'Paint',
  }

  // Generate CSV
  const header = 'Date,Worker,Job Number,Block,Work Section,Start Time,End Time,Hours'
  const rows = timesheets.map(
    (t: any) => `${t.date},${t.workerName},${t.jobNum},${t.section},${SECTION_LABELS[t.workSection] || t.workSection || ''},${t.startTime},${t.endTime},${t.hours}`
  )
  const csv = [header, ...rows].join('\n')

  // If Resend API key is configured, send email
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const csvBuffer = Buffer.from(csv, 'utf-8')

      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'YLZ Workshop <noreply@ylztruckbodies.com.au>',
        to: ['liz@ylztruckbodies.com', 'accounts@ylztruckbodies.com'],
        subject: `Timesheet Export — ${date || 'All'}`,
        text: `Timesheet export for ${date || 'all dates'}. See attached CSV.`,
        attachments: [
          {
            filename: `timesheet-${date || 'all'}.csv`,
            content: csvBuffer,
          },
        ],
      })
    } catch (e) {
      console.error('Email send failed:', e)
    }
  }

  // Return CSV for download regardless
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timesheet-${date || 'all'}.csv"`,
    },
  })
}
