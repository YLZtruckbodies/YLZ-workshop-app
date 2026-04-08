import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        from: 'YLZ Workshop <noreply@ylztruckbodies.com>',
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
