import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const authorId = formData.get('authorId') as string || 'system'
  const authorName = formData.get('authorName') as string || 'System'
  const caption = formData.get('caption') as string || ''

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { id: true, num: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const storedName = `${Date.now()}_${job.num}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const uploadDir = path.join(process.cwd(), 'uploads', 'job-photos')

  try { await mkdir(uploadDir, { recursive: true }) } catch {}
  await writeFile(path.join(uploadDir, storedName), buffer)

  const note = await prisma.jobNote.create({
    data: {
      jobId: params.id,
      authorId,
      authorName,
      type: 'photo',
      message: caption || 'Photo attached',
      photoUrl: `/api/photos/${storedName}`,
      photoName: file.name,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
