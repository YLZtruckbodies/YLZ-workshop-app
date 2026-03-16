import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { date } = await req.json()

  const timesheets = await prisma.timesheet.findMany({
    where: date ? { date } : {},
    orderBy: { createdAt: 'asc' },
  })

  // Generate CSV
  const header = 'Date,Worker,Job Number,Section,Start Time,End Time,Hours'
  const rows = timesheets.map(
    (t) => `${t.date},${t.workerName},${t.jobNum},${t.section},${t.startTime},${t.endTime},${t.hours}`
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
