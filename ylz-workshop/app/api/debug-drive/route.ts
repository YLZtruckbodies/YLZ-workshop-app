import { NextRequest, NextResponse } from 'next/server'
import { getDriveClient, getDriveAccessToken } from '@/lib/drive'

const PARTS_SHARED_DRIVE_ID = '0AMEx2pR1R5dwUk9PVA'
const PARTS_CONTAINER_ID = '1eAs6Dv4F8DdcvNIFWuggfR1YZzHwPZNo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pn = searchParams.get('pn') || '10001'

  const log: string[] = []

  try {
    const drive = await getDriveClient()
    log.push('✅ Drive client initialised')

    // Get access token
    const accessToken = await getDriveAccessToken()
    if (accessToken) {
      log.push(`✅ Access token obtained (${accessToken.slice(0, 20)}...)`)
    } else {
      log.push(`❌ Failed to get access token`)
    }

    const sharedDriveParams = {
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive' as const,
      driveId: PARTS_SHARED_DRIVE_ID,
    }

    // Step 1: List what's in the container (first 20 items)
    log.push(`\n--- Step 1: Container contents (first 20) ---`)
    const containerRes = await drive.files.list({
      q: `'${PARTS_CONTAINER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 20,
      orderBy: 'name',
      ...sharedDriveParams,
    })
    const containerItems = containerRes.data.files || []
    log.push(`Found ${containerItems.length} items in container`)
    containerItems.forEach(f => log.push(`  • ${f.name} (${f.mimeType})`))

    // Step 2: Search for the part number
    log.push(`\n--- Step 2: Search for part "${pn}" ---`)
    const partFolderRes = await drive.files.list({
      q: `'${PARTS_CONTAINER_ID}' in parents and name contains '${pn}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name desc',
      pageSize: 10,
      ...sharedDriveParams,
    })
    const partFolders = partFolderRes.data.files || []
    log.push(`Found ${partFolders.length} matching folders`)
    partFolders.forEach(f => log.push(`  • ${f.name} (id: ${f.id})`))

    const partFolder = partFolders.find(f => f.name?.startsWith(pn)) ?? partFolders[0]
    if (!partFolder?.id) {
      log.push(`❌ No part folder found for "${pn}"`)
      return NextResponse.json({ log, pn })
    }
    log.push(`✅ Selected folder: ${partFolder.name}`)

    // Step 3: Find PDF subfolder
    log.push(`\n--- Step 3: Find PDF subfolder ---`)
    const pdfFolderRes = await drive.files.list({
      q: `'${partFolder.id}' in parents and name = 'PDF' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
      ...sharedDriveParams,
    })
    const pdfFolder = pdfFolderRes.data.files?.[0]
    if (!pdfFolder?.id) {
      // List what IS in the part folder
      const partContentsRes = await drive.files.list({
        q: `'${partFolder.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 20,
        ...sharedDriveParams,
      })
      log.push(`❌ No PDF subfolder. Contents of part folder:`)
      ;(partContentsRes.data.files || []).forEach(f => log.push(`  • ${f.name} (${f.mimeType})`))
      return NextResponse.json({ log, pn })
    }
    log.push(`✅ PDF subfolder found: ${pdfFolder.name}`)

    // Step 4: Find PDF file
    log.push(`\n--- Step 4: Find PDF file ---`)
    const pdfFileRes = await drive.files.list({
      q: `'${pdfFolder.id}' in parents and mimeType = 'application/pdf' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
      ...sharedDriveParams,
    })
    const pdfFile = pdfFileRes.data.files?.[0]
    if (!pdfFile?.id) {
      log.push(`❌ No PDF file found in PDF subfolder`)
      return NextResponse.json({ log, pn })
    }
    log.push(`✅ PDF file found: ${pdfFile.name} (id: ${pdfFile.id})`)

    // Step 5: Try fetching thumbnail
    log.push(`\n--- Step 5: Fetch thumbnail ---`)
    if (accessToken) {
      const thumbUrl = `https://drive.google.com/thumbnail?id=${pdfFile.id}&sz=s400`
      const thumbRes = await fetch(thumbUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      log.push(`Thumbnail request: ${thumbRes.status} ${thumbRes.statusText}`)
      if (thumbRes.ok) {
        const bytes = (await thumbRes.arrayBuffer()).byteLength
        log.push(`✅ Thumbnail fetched: ${bytes} bytes`)
      } else {
        log.push(`❌ Thumbnail failed`)
      }
    } else {
      log.push(`⚠️ No access token — skipping thumbnail`)
    }

  } catch (e: unknown) {
    log.push(`\n❌ FATAL ERROR: ${e instanceof Error ? e.message : String(e)}`)
    if (e instanceof Error && 'code' in e) log.push(`  code: ${(e as NodeJS.ErrnoException).code}`)
  }

  return NextResponse.json({ pn, log })
}
