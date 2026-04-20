import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient } from '@/lib/drive'

function scoreFile(name: string, axleCount: string, axleMake: string, axleType: string, studPattern: string): number {
  const n = name.toLowerCase()
  let score = 0
  // Stud pattern PCD (e.g. "335PCD" → "335") — highest priority
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
  const axleCount   = searchParams.get('axleCount')   || ''
  const axleMake    = searchParams.get('axleMake')    || ''
  const axleType    = searchParams.get('axleType')    || ''
  const studPattern = searchParams.get('studPattern') || ''

  const debug: string[] = []

  try {
    const drive = await getDriveClient()
    debug.push(`Params — axleCount: "${axleCount}", axleMake: "${axleMake}", axleType: "${axleType}", studPattern: "${studPattern}"`)

    // Search for PDFs with "Axle" in the filename across all accessible drives
    // (avoids parent-folder navigation which fails for this shared drive structure)
    let rawFiles: Array<{ id?: string | null; name?: string | null; webViewLink?: string | null }> = []

    try {
      debug.push('Searching allDrives for PDFs with "Axle" in filename...')
      const res = await drive.files.list({
        q: `name contains 'Axle' and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
        orderBy: 'name',
        pageSize: 100,
      })
      rawFiles = res.data.files || []
      debug.push(`Found ${rawFiles.length} PDF(s)`)
      if (rawFiles.length > 0) debug.push(`Sample: ${rawFiles.slice(0, 3).map(f => f.name).join(', ')}`)
    } catch (e: unknown) {
      debug.push(`allDrives search error: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Fallback: try user corpora (My Drive + shared with me)
    if (rawFiles.length === 0) {
      try {
        debug.push('Falling back to user corpora search...')
        const res = await drive.files.list({
          q: `name contains 'Axle' and mimeType = 'application/pdf' and trashed = false`,
          fields: 'files(id, name, webViewLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'user',
          orderBy: 'name',
          pageSize: 100,
        })
        rawFiles = res.data.files || []
        debug.push(`Found ${rawFiles.length} PDF(s) via user search`)
        if (rawFiles.length > 0) debug.push(`Sample: ${rawFiles.slice(0, 3).map(f => f.name).join(', ')}`)
      } catch (e: unknown) {
        debug.push(`user search error: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (rawFiles.length === 0) {
      debug.push('No PDFs found — the Google account used by this app may not have access to the YLZ Engineering drive')
      return NextResponse.json({ files: [], debug }, { status: 404 })
    }

    const files = rawFiles
      .filter(f => f.name && f.id)
      .map(f => ({
        id: f.id!,
        name: f.name!,
        webViewLink: f.webViewLink || undefined,
        score: scoreFile(f.name!, axleCount, axleMake, axleType, studPattern),
      }))
      .sort((a, b) => b.score - a.score)

    debug.push(`Best match: "${files[0]?.name}" (score: ${files[0]?.score})`)

    return NextResponse.json({ files, debug })
  } catch (e: unknown) {
    debug.push(`Unhandled error: ${e instanceof Error ? e.message : String(e)}`)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to search', files: [], debug },
      { status: 500 }
    )
  }
}
