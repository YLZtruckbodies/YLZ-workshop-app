import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const signoffs = await prisma.deliverySignoff.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(signoffs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { jobId, signedBy, signerRole = 'customer', signatureDataUrl, driverName = '', notes = '' } = body

  if (!jobId || !signedBy || !signatureDataUrl) {
    return NextResponse.json({ error: 'jobId, signedBy, and signatureDataUrl required' }, { status: 400 })
  }

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { num: true, customer: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Save signature PNG to disk
  const matches = signatureDataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) return NextResponse.json({ error: 'Invalid signature data' }, { status: 400 })

  const buffer = Buffer.from(matches[2], 'base64')
  const fileName = `${job.num}-${Date.now()}.png`
  const uploadDir = path.join(process.cwd(), 'uploads', 'signoffs')

  try { await mkdir(uploadDir, { recursive: true }) } catch {}
  await writeFile(path.join(uploadDir, fileName), buffer)

  const signatureUrl = `/api/signoffs/image/${fileName}`

  const signoff = await prisma.deliverySignoff.create({
    data: {
      jobId,
      jobNum: job.num,
      customer: job.customer,
      signedBy,
      signerRole,
      signatureUrl,
      driverName,
      notes,
    },
  })

  // Add note to activity feed
  await prisma.jobNote.create({
    data: {
      jobId,
      authorId: 'system',
      authorName: 'System',
      type: 'signoff',
      message: `Delivery signed off by ${signedBy} (${signerRole})${driverName ? ` — Driver: ${driverName}` : ''}`,
    },
  })

  return NextResponse.json(signoff)
}
