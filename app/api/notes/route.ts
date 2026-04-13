import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const type = searchParams.get('type')
  const active = searchParams.get('active')

  const where: any = {}
  if (jobId) where.jobId = jobId
  if (type) where.type = type

  const notes = await prisma.jobNote.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // If active=true, return only holdups that don't have a matching "resolved" note
  if (active === 'true') {
    // Get all holdup notes
    const holdups = notes.filter((n: any) => n.type === 'holdup')
    // Get all resolved notes
    const resolved = notes.filter((n: any) => n.type === 'resolved')
    const resolvedJobIds = new Set(resolved.map((r: any) => r.jobId))

    // A holdup is active if no resolved note exists for the same job AFTER the holdup
    const activeHoldups = holdups.filter((h: any) => {
      const resolvedAfter = resolved.find(
        (r: any) => r.jobId === h.jobId && new Date(r.createdAt) > new Date(h.createdAt)
      )
      return !resolvedAfter
    })
    return NextResponse.json(activeHoldups)
  }

  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jobId, authorId, authorName, type, message, photoUrl = '', photoName = '' } = body

  if (!jobId || !type || !message) {
    return NextResponse.json({ error: 'jobId, type, and message are required' }, { status: 400 })
  }

  const note = await prisma.jobNote.create({
    data: {
      jobId,
      authorId: authorId || 'system',
      authorName: authorName || 'System',
      type,
      message,
      photoUrl,
      photoName,
    },
  })

  // Send email notification when a holdup is posted
  if (type === 'holdup') {
    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)
        const fromEmail = process.env.FROM_EMAIL || 'noreply@ylztrucks.com.au'
        const peteEmail = process.env.PETE_EMAIL || 'pete@ylztruckbodies.com.au'
        const nathanEmail = process.env.NATHAN_EMAIL || 'nathan@ylztruckbodies.com.au'
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px">
            <div style="background:#ef4444;padding:16px 24px;border-radius:6px 6px 0 0">
              <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px">⚠️ YLZ — Job Hold Up</span>
            </div>
            <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 6px 6px">
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
                <tr><td style="padding:8px 0;color:#666;font-size:13px;width:140px">Job</td><td style="font-weight:700;font-size:15px">${jobId}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:13px">Posted By</td><td style="font-weight:600">${authorName || 'Unknown'}</td></tr>
              </table>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:20px">
                <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Hold Up Reason</div>
                <div style="font-size:14px;color:#1a1a1a;line-height:1.5">${message}</div>
              </div>
              <p style="color:#999;font-size:12px;margin:0">This hold up requires attention before work can continue.</p>
            </div>
          </div>
        `
        await resend.emails.send({
          from: fromEmail,
          to: [peteEmail, nathanEmail],
          subject: `Hold Up: Job ${jobId} — ${message.substring(0, 60)}`,
          html,
        })
      } catch {
        // graceful failure — do not block the response
      }
    }
  }

  return NextResponse.json(note, { status: 201 })
}
