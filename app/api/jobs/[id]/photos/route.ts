import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const dataUrl = formData.get('dataUrl') as string | null
  const filename = (formData.get('filename') as string) || 'photo.jpg'
  const authorId = (formData.get('authorId') as string) || 'system'
  const authorName = (formData.get('authorName') as string) || 'System'
  const caption = (formData.get('caption') as string) || ''
  const noteType = (formData.get('noteType') as string) || 'photo'

  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'No valid image data URL provided' }, { status: 400 })
  }

  const job = await prisma.job.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const note = await prisma.jobNote.create({
    data: {
      jobId: params.id,
      authorId,
      authorName,
      type: noteType,
      message: caption || (noteType === 'qa-final-report' ? 'Final QA photo' : 'Photo attached'),
      photoUrl: dataUrl,
      photoName: filename,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
