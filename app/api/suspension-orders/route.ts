import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'
import { drive_v3 } from 'googleapis'

// Root folder ID from G:\.shortcut-targets-by-id path
const YLZ_ROOT_ID = '11I4WxzE7drzxHwG58yG6I8nV2l5tl3KM'

// Path from root to the Generic Orders folder
const FOLDER_PATH = ['YLZ', 'Engineering', 'Order Forms', 'Suspension', 'Generic Orders']

let cachedFolderId: string | null = null

async function findChildFolder(drive: drive_v3.Drive, parentId: string, name: string, sharedDriveId: string): Promise<{ id: string | null; tried: string[] }> {
  const safe = name.replace(/'/g, "\\'")
  const tried: string[] = []

  // Strategy 1: corpora=drive with explicit driveId (required for shared drive root navigation)
  try {
    tried.push(`corpora=drive driveId=${sharedDriveId}`)
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: sharedDriveId,
    })
    const id = res.data.files?.[0]?.id ?? null
    if (id) return { id, tried }
    tried.push(`→ 0 results`)
  } catch (e: unknown) {
    tried.push(`→ error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Strategy 2: corpora=allDrives fallback
  try {
    tried.push(`corpora=allDrives`)
    const res = await drive.files.list({
      q: `'${parentId}' in parents and name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    })
    const id = res.data.files?.[0]?.id ?? null
    if (id) return { id, tried }
    tried.push(`→ 0 results`)
  } catch (e: unknown) {
    tried.push(`→ error: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { id: null, tried }
}

async function getGenericOrdersFolderId(drive: drive_v3.Drive): Promise<{ id: string; debug: string[] } | { error: string; debug: string[] }> {
  const debug: string[] = []

  if (cachedFolderId) {
    debug.push(`Using cached folder ID: ${cachedFolderId}`)
    return { id: cachedFolderId, debug }
  }

  debug.push(`Navigating path from root ${YLZ_ROOT_ID}`)
  let currentId = YLZ_ROOT_ID

  for (const segment of FOLDER_PATH) {
    debug.push(`Looking for "${segment}" inside ${currentId}`)
    const { id: childId, tried } = await findChildFolder(drive, currentId, segment, YLZ_ROOT_ID)
    debug.push(`  Tried: ${tried.join(' | ')}`)
    if (!childId) {
      debug.push(`❌ "${segment}" not found`)
      return { error: `Could not find folder: "${segment}"`, debug }
    }
    debug.push(`✓ "${segment}" → ${childId}`)
    currentId = childId
  }

  cachedFolderId = currentId
  return { id: currentId, debug }
}

function scoreFile(name: string, axleCount: string, axleMake: string, axleType: string, studPattern: string): number {
  const n = name.toLowerCase()
  let score = 0
  // Stud pattern PCD number — highest priority (e.g. "335PCD" → look for "335" in filename)
  if (studPattern) {
    const pcd = studPattern.replace(/[^0-9]/g, '')
    if (pcd && n.includes(pcd)) score += 5
  }
  // Axle count
  if (axleCount) {
    const countNum = axleCount.replace(/[^0-9]/g, '')
    if (countNum && (n.includes(`${countNum} axle`) || n.includes(`${countNum}-axle`))) score += 4
    else if (countNum && n.includes(countNum)) score += 2
  }
  if (axleMake && n.includes(axleMake.toLowerCase())) score += 3
  if (axleType && n.includes(axleType.toLowerCase())) score += 3
  return score
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const axleCount    = searchParams.get('axleCount')    || ''
  const axleMake     = searchParams.get('axleMake')     || ''
  const axleType     = searchParams.get('axleType')     || ''
  const studPattern  = searchParams.get('studPattern')  || ''

  const debug: string[] = []

  try {
    const drive = await getDriveClient()
    debug.push(`Params — axleCount: "${axleCount}", axleMake: "${axleMake}", axleType: "${axleType}", studPattern: "${studPattern}"`)

    const folderResult = await getGenericOrdersFolderId(drive)
    debug.push(...folderResult.debug)

    if ('error' in folderResult) {
      return NextResponse.json({ error: folderResult.error, files: [], debug }, { status: 404 })
    }

    debug.push(`Listing PDFs in Generic Orders folder ${folderResult.id}`)
    const listRes = await drive.files.list({
      q: `'${folderResult.id}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
      orderBy: 'name',
      pageSize: 100,
    })

    const rawFiles = listRes.data.files || []
    debug.push(`Found ${rawFiles.length} file(s) in folder`)

    const files = rawFiles
      .filter(f => f.name?.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        id: f.id!,
        name: f.name!,
        webViewLink: f.webViewLink || undefined,
        score: scoreFile(f.name!, axleCount, axleMake, axleType, studPattern),
      }))
      .sort((a, b) => b.score - a.score)

    debug.push(`${files.length} PDF(s) after filtering`)
    if (files.length > 0) debug.push(`Best match: "${files[0].name}" (score: ${files[0].score})`)

    return NextResponse.json({ files, debug })
  } catch (e: unknown) {
    debug.push(`Unhandled error: ${e instanceof Error ? e.message : String(e)}`)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to search for suspension orders', files: [], debug },
      { status: 500 }
    )
  }
}
