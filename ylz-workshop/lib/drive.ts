import { google, drive_v3 } from 'googleapis'

// Job Sheets parent folder ID in Google Drive
const JOB_SHEETS_FOLDER_ID = '10ZvynBY7AOABRU4q_D_SmSrAFN0OkzMI'

// YLZparts drawings folder ID
const PARTS_FOLDER_ID = '0AMEx2pR1R5dwUk9PVA'

// ── Auth ─────────────────────────────────────────────────────────────────────

let driveClient: drive_v3.Drive | null = null

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

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  driveClient = google.drive({ version: 'v3', auth: oauth2Client })
  return driveClient
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
 * Search the YLZparts folder for PDFs matching the given part numbers.
 * Returns a Map<partNumber, Buffer> of JPEG thumbnail images from Google Drive.
 */
export async function fetchPartDrawings(partNumbers: string[]): Promise<Map<string, Buffer>> {
  const drive = await getDriveClient()
  const result = new Map<string, Buffer>()

  // Get OAuth access token for fetching thumbnail URLs
  let accessToken: string | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (drive as any)._options.auth
    const tokenRes = await auth.getAccessToken()
    accessToken = tokenRes.token
  } catch { /* fall through — thumbnails will be skipped */ }

  await Promise.all(partNumbers.map(async (pn) => {
    try {
      const res = await drive.files.list({
        q: `'${PARTS_FOLDER_ID}' in parents and name contains '${pn}' and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
      })
      const file = res.data.files?.[0]
      if (!file?.id) return

      if (accessToken) {
        // Use Google's thumbnail endpoint — works for PDFs in Drive with OAuth token
        const thumbUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=s400`
        const thumbRes = await fetch(thumbUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (thumbRes.ok) {
          result.set(pn, Buffer.from(await thumbRes.arrayBuffer()))
        }
      }
    } catch {
      // Drawing not found or download failed — skip, placeholder will be shown
    }
  }))

  return result
}
