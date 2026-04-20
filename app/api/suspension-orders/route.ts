import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'

function scoreFile(name: string, axleCount: string, axleMake: string, axleType: string): number {
  const n = name.toLowerCase()
  let score = 0
  // Match "{count} axle" or "{count}-axle" in filename (e.g. "4 Axle", "4-Axle")
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

    // Strategy 1: search in YLZ shared drive
    let allFiles: Array<{ id?: string | null; name?: string | null; webViewLink?: string | null }> = []
    try {
      debug.push('Trying drive-scoped search (YLZ shared drive)...')
      const res = await drive.files.list({
        q: `name contains 'Axle' and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: '11I4WxzE7drzxHwG58yG6I8nV2l5tl3KM',
        orderBy: 'name',
        pageSize: 100,
      })
      allFiles = res.data.files || []
      debug.push(`Drive search returned ${allFiles.length} file(s)`)
      if (allFiles.length > 0) {
        debug.push(`Files found: ${allFiles.slice(0, 5).map(f => f.name).join(', ')}`)
      }
    } catch (e: unknown) {
      debug.push(`Drive search failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Strategy 2: fallback to allDrives
    if (allFiles.length === 0) {
      try {
        debug.push('Falling back to allDrives search...')
        const res = await drive.files.list({
          q: `name contains 'Axle' and mimeType = 'application/pdf' and trashed = false`,
          fields: 'files(id, name, webViewLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          orderBy: 'name',
          pageSize: 100,
        })
        allFiles = res.data.files || []
        debug.push(`allDrives search returned ${allFiles.length} file(s)`)
        if (allFiles.length > 0) {
          debug.push(`Files found: ${allFiles.slice(0, 5).map(f => f.name).join(', ')}`)
        }
      } catch (e: unknown) {
        debug.push(`allDrives search failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (allFiles.length === 0) {
      debug.push('No PDF files with "Axle" in name found in any accessible drive')
      return NextResponse.json({ files: [], debug }, { status: 404 })
    }

    const files = allFiles
      .map(f => ({
        id: f.id!,
        name: f.name!,
        webViewLink: f.webViewLink || undefined,
        score: scoreFile(f.name!, axleCount, axleMake, axleType),
      }))
      .sort((a, b) => b.score - a.score)

    debug.push(`Best match: "${files[0]?.name}" (score: ${files[0]?.score})`)

    return NextResponse.json({ files, debug })
  } catch (e: unknown) {
    debug.push(`Unhandled error: ${e instanceof Error ? e.message : String(e)}`)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to search for suspension orders', debug },
      { status: 500 }
    )
  }
}
