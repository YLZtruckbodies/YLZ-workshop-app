import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'
import { drive_v3 } from 'googleapis'

// Root folder ID from G:\.shortcut-targets-by-id path
const YLZ_ROOT_ID = '11I4WxzE7drzxHwG58yG6I8nV2l5tl3KM'

// Path from root to the Generic Orders folder
const FOLDER_PATH = ['YLZ', 'Engineering', 'Order Forms', 'Suspension', 'Generic Orders']

let cachedFolderId: string | null = null

async function findChildInAnyDrive(drive: drive_v3.Drive, parentId: string, name: string): Promise<string | null> {
  const safe = name.replace(/'/g, "\\'")
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safe}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  })
  return res.data.files?.[0]?.id ?? null
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
    try {
      const childId = await findChildInAnyDrive(drive, currentId, segment)
      if (!childId) {
        debug.push(`❌ "${segment}" not found`)
        return { error: `Could not find folder: "${segment}"`, debug }
      }
      debug.push(`✓ Found "${segment}" → ${childId}`)
      currentId = childId
    } catch (e: unknown) {
      debug.push(`❌ Error looking for "${segment}": ${e instanceof Error ? e.message : String(e)}`)
      return { error: `Error navigating to "${segment}"`, debug }
    }
  }

  cachedFolderId = currentId
  return { id: currentId, debug }
}

function scoreFile(name: string, axleCount: string, axleMake: string, axleType: string): number {
  const n = name.toLowerCase()
  let score = 0
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
  const axleCount = searchParams.get('axleCount') || ''
  const axleMake  = searchParams.get('axleMake')  || ''
  const axleType  = searchParams.get('axleType')  || ''

  const debug: string[] = []

  try {
    const drive = await getDriveClient()
    debug.push(`Params — axleCount: "${axleCount}", axleMake: "${axleMake}", axleType: "${axleType}"`)

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
        score: scoreFile(f.name!, axleCount, axleMake, axleType),
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
