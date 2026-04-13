import { NextRequest, NextResponse } from 'next/server'
import { browseDriveFolder, searchDrive, PARTS_ROOT_FOLDER_ID } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId') || PARTS_ROOT_FOLDER_ID
  const q = searchParams.get('q')?.trim()

  try {
    const items = q
      ? await searchDrive(q)
      : await browseDriveFolder(folderId)
    return NextResponse.json(items)
  } catch (e: unknown) {
    console.error('Drive browse error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list folder' },
      { status: 500 }
    )
  }
}
