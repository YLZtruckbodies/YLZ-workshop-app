import { NextRequest, NextResponse } from 'next/server'
import { browseDriveFolderAny, findChildFolder } from '@/lib/drive'
// browseDriveFolderAny searches across all drives; findChildFolder uses includeItemsFromAllDrives

// Root of the YLZ Engineering shared drive (from .shortcut-targets-by-id path)
const YLZ_DRIVE_ROOT = '11I4WxzE7drzxHwG58yG6I8nV2l5tl3KM'

// Path from root to the Generic Orders folder
const FOLDER_PATH = ['YLZ', 'Engineering', 'Order Forms', 'Suspension', 'Generic Orders']

// Cache the resolved Generic Orders folder ID so we don't navigate on every request
let cachedFolderId: string | null = null

async function getGenericOrdersFolderId(): Promise<string | null> {
  if (cachedFolderId) return cachedFolderId
  let current = YLZ_DRIVE_ROOT
  for (const segment of FOLDER_PATH) {
    const child = await findChildFolder(current, segment)
    if (!child) return null
    current = child
  }
  cachedFolderId = current
  return current
}

/**
 * Score a filename against the axle config.
 * Higher = better match.
 */
function scoreFile(name: string, axleCount: string, axleMake: string, axleType: string): number {
  const n = name.toLowerCase()
  let score = 0
  if (axleCount && n.includes(axleCount)) score += 3
  if (axleMake && n.includes(axleMake.toLowerCase())) score += 2
  if (axleType && n.includes(axleType.toLowerCase())) score += 2
  return score
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const axleCount = searchParams.get('axleCount') || ''
  const axleMake  = searchParams.get('axleMake')  || ''
  const axleType  = searchParams.get('axleType')  || ''

  try {
    const folderId = await getGenericOrdersFolderId()
    if (!folderId) {
      return NextResponse.json({ error: 'Could not locate Generic Orders folder in Drive' }, { status: 404 })
    }

    const files = await browseDriveFolderAny(folderId)
    const pdfs = files.filter(f => !f.isFolder && f.name.toLowerCase().endsWith('.pdf'))

    // Score and sort — best match first
    const scored = pdfs
      .map(f => ({ ...f, score: scoreFile(f.name, axleCount, axleMake, axleType) }))
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({ files: scored, folderId })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list suspension orders' },
      { status: 500 }
    )
  }
}
