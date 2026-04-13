import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'job-photos', params.filename)
    const buffer = await readFile(filePath)
    const ext = params.filename.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return new NextResponse(buffer, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' } })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
