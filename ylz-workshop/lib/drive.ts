import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

// Job Sheets parent folder ID in Google Drive
const JOB_SHEETS_FOLDER_ID = '10ZvynBY7AOABRU4q_D_SmSrAFN0OkzMI'

// YLZparts Shared Drive — root drive ID and parts container folder ID
// Structure: [PARTS_CONTAINER_ID] / [part-number folder] / PDF / [drawing.pdf]
const PARTS_SHARED_DRIVE_ID = '0AMEx2pR1R5dwUk9PVA'
const PARTS_CONTAINER_ID = '1eAs6Dv4F8DdcvNIFWuggfR1YZzHwPZNo'

// ── Auth ─────────────────────────────────────────────────────────────────────

let driveClient: drive_v3.Drive | null = null
let oauthClient: InstanceType<typeof google.auth.OAuth2> | null = null

export async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient) return driveClient

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env'
    )
  }

  oauthClient = new google.auth.OAuth2(clientId, clientSecret)
  oauthClient.setCredentials({ refresh_token: refreshToken })

  driveClient = google.drive({ version: 'v3', auth: oauthClient })
  return driveClient
}

export async function getDriveAccessToken(): Promise<string | null> {
  await getDriveClient() // ensure oauthClient is initialised
  if (!oauthClient) return null
  try {
    const tokenRes = await oauthClient.getAccessToken()
    return tokenRes.token ?? null
  } catch {
    return null
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
  webViewLink: string
  thumbnailLink?: string
  source: 'drive'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a job number for matching against Drive folder names.
 * App uses "YLZ 1067" (with space), Drive uses "YLZ1067" (no space).
 */
function normaliseJobNum(num: string): string {
  return num.replace(/\s+/g, '').toUpperCase()
}

/**
 * Find the Google Drive folder that matches a given job number.
 * Searches inside the Job Sheets parent folder.
 */
export async function findJobFolder(jobNum: string): Promise<string | null> {
  const drive = await getDriveClient()
  const normalised = normaliseJobNum(jobNum)

  const res = await drive.files.list({
    q: `'${JOB_SHEETS_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${normalised}' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
  })

  const folders = res.data.files || []
  return folders.length > 0 ? folders[0].id! : null
}

/**
 * List all files inside a Drive folder.
 */
export async function listFolderFiles(folderId: string): Promise<DriveFile[]> {
  const drive = await getDriveClient()

  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink)',
      pageSize: 100,
      pageToken,
      orderBy: 'name',
    })

    for (const f of res.data.files || []) {
      files.push({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType || 'application/octet-stream',
        size: parseInt(f.size || '0'),
        modifiedTime: f.modifiedTime || '',
        webViewLink: f.webViewLink || '',
        thumbnailLink: f.thumbnailLink || undefined,
        source: 'drive',
      })
    }

    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)

  return files
}

/**
 * List all files for a given job number by finding the matching Drive folder.
 * Returns empty array if no matching folder is found.
 */
export async function listJobDriveFiles(jobNum: string): Promise<DriveFile[]> {
  const folderId = await findJobFolder(jobNum)
  if (!folderId) return []
  return listFolderFiles(folderId)
}

/**
 * Find the job folder or create it if it doesn't exist.
 */
export async function findOrCreateJobFolder(jobNum: string): Promise<string> {
  const drive = await getDriveClient()
  const normalised = normaliseJobNum(jobNum)

  // Try to find existing folder first
  const existing = await findJobFolder(jobNum)
  if (existing) return existing

  // Create it
  const res = await drive.files.create({
    requestBody: {
      name: normalised,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [JOB_SHEETS_FOLDER_ID],
    },
    fields: 'id',
  })

  return res.data.id!
}

/**
 * Upload a file buffer to the job's Google Drive folder.
 * Returns the Drive file ID.
 */
export async function uploadFileToDrive(
  jobNum: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const drive = await getDriveClient()
  const folderId = await findOrCreateJobFolder(jobNum)
  const stream = Readable.from(buffer)

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id',
  })

  return res.data.id!
}

/**
 * Delete a file from Google Drive by its file ID.
 */
export async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  const drive = await getDriveClient()
  await drive.files.delete({ fileId: driveFileId })
}

/**
 * Download a file from Google Drive as a Buffer.
 */
export async function downloadDriveFile(fileId: string): Promise<{
  buffer: Buffer
  mimeType: string
  fileName: string
}> {
  const drive = await getDriveClient()

  // Get file metadata first
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
  })

  // Check if this is a Google Workspace file that needs export
  const mimeType = meta.data.mimeType || 'application/octet-stream'
  const fileName = meta.data.name || 'download'

  if (mimeType.startsWith('application/vnd.google-apps.')) {
    // Export Google Docs/Sheets/etc to a downloadable format
    const exportMap: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/pdf',
      'application/vnd.google-apps.presentation': 'application/pdf',
      'application/vnd.google-apps.drawing': 'image/png',
    }
    const exportMime = exportMap[mimeType] || 'application/pdf'

    const res = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: 'arraybuffer' }
    )

    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: exportMime,
      fileName: `${fileName}.pdf`,
    }
  }

  // Regular file — download directly
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )

  return {
    buffer: Buffer.from(res.data as ArrayBuffer),
    mimeType,
    fileName,
  }
}

/**
 * Search ALL Google Drive (all drives + shared with me) for PDFs matching the given part numbers.
 * Trial mode: broad global search rather than scoped folder traversal.
 * Returns a Map<partNumber, Buffer> of JPEG thumbnail images.
 */
export async function fetchPartDrawings(partNumbers: string[]): Promise<Map<string, Buffer>> {
  const drive = await getDriveClient()
  const result = new Map<string, Buffer>()

  const accessToken = await getDriveAccessToken()
  if (!accessToken) return result

  await Promise.all(partNumbers.map(async (pn) => {
    const basePn = stripRevision(pn)
    try {
      // Single global search — finds the PDF regardless of which drive or folder it lives in.
      // Sort name desc so the latest revision (e.g. 100-05-004.B.pdf > 100-05-004.A.pdf) wins.
      const res = await drive.files.list({
        // No mimeType filter — files may be stored with wrong MIME type despite .pdf extension.
        // Filter to .pdf by name in code instead.
        // Request thumbnailLink — Drive returns a pre-authenticated URL, no Bearer token needed.
        q: `name contains '${basePn}' and trashed = false`,
        fields: 'files(id, name, thumbnailLink)',
        orderBy: 'name desc',
        pageSize: 10,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: PARTS_SHARED_DRIVE_ID,
      })

      // Pick the first result whose name ends with .pdf (case-insensitive)
      const pdfFile = res.data.files?.find(f => f.name?.toLowerCase().endsWith('.pdf'))
      if (!pdfFile?.id) return

      // Prefer the API-provided thumbnailLink (pre-authenticated, works for Shared Drive).
      // Fall back to the manual thumbnail endpoint if thumbnailLink is absent.
      const thumbUrl = pdfFile.thumbnailLink
        ? pdfFile.thumbnailLink.replace(/=s\d+$/, '=s800')  // bump to s800 resolution
        : `https://drive.google.com/thumbnail?id=${pdfFile.id}&sz=s800`

      const thumbRes = await fetch(thumbUrl, {
        headers: pdfFile.thumbnailLink ? {} : { Authorization: `Bearer ${accessToken}` },
      })
      if (thumbRes.ok) {
        result.set(pn, Buffer.from(await thumbRes.arrayBuffer()))
      }
    } catch {
      // Not found or thumbnail failed — placeholder shown on card
    }
  }))

  return result
}

// ── Drive Browser ─────────────────────────────────────────────────────────────

export const PARTS_SHARED_DRIVE_ID_PUBLIC = '0AMEx2pR1R5dwUk9PVA'
export const PARTS_ROOT_FOLDER_ID = '1eAs6Dv4F8DdcvNIFWuggfR1YZzHwPZNo'

/**
 * Strip MRPeasy revision suffix from a part number before searching Drive.
 * MRPeasy formats revisions as "100-01-001.A" — Drive folders are "100-01-001".
 */
function stripRevision(pn: string): string {
  return pn.replace(/\.[a-zA-Z]$/, '').trim()
}

export interface BrowseItem {
  id: string
  name: string
  mimeType: string
  isFolder: boolean
  webViewLink?: string
  modifiedTime?: string
}

/**
 * Search across the entire YLZparts Shared Drive by name.
 */
export async function searchDrive(query: string): Promise<BrowseItem[]> {
  const drive = await getDriveClient()

  const safe = stripRevision(query).replace(/'/g, "\\'")
  const res = await drive.files.list({
    q: `name contains '${safe}' and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
    orderBy: 'folder,name',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: PARTS_SHARED_DRIVE_ID_PUBLIC,
  })

  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType || 'application/octet-stream',
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    webViewLink: f.webViewLink || undefined,
    modifiedTime: f.modifiedTime || undefined,
  }))
}

/**
 * List the contents of a folder inside the YLZparts Shared Drive.
 */
export async function browseDriveFolder(folderId: string): Promise<BrowseItem[]> {
  const drive = await getDriveClient()

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    orderBy: 'folder,name',
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: PARTS_SHARED_DRIVE_ID_PUBLIC,
  })

  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType || 'application/octet-stream',
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    webViewLink: f.webViewLink || undefined,
    modifiedTime: f.modifiedTime || undefined,
  }))
}
