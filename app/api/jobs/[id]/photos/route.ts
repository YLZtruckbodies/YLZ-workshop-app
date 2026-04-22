import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData()
    const dataUrl = formData.get('dataUrl') as string | null
    const filename = (formData.get('filename') as string) || 'photo.jpg'
    const authorId = (formData.get('authorId') as string) || 'system'
    const authorName = (formData.get('authorName') as string) || 'System'
    const caption = (formData.get('caption') as string) || ''
    const noteType = (formData.get('noteType') as string) || 'photo'

    if (!dataUrl) {
      return NextResponse.json({ error: 'No dataUrl field in request' }, { status: 400 })
    }
    if (!dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: `dataUrl is not a valid image (starts with: ${dataUrl.slice(0, 30)}...)` }, { status: 400 })
    }

    const job = await prisma.job.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!job) return NextResponse.json({ error: `Job ${params.id} not found` }, { status: 404 })

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[photos upload] error:', err)
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 })
  }
}
