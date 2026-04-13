import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filePath = path.join(process.cwd(), 'uploads', 'signoffs', params.filename)
    const buffer = await readFile(filePath)
    return new NextResponse(buffer, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' } })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
