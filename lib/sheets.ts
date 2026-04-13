import { google, sheets_v4 } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { compDate } from '@/lib/workdays'
import {
  SheetWorkerBlock,
  SHEET_WORKER_BLOCKS,
  SHEET_TAB_SCHEDULE,
  findBlocksForWorker,
  findBlockByCell,
} from '@/lib/sheets-config'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
const SYNC_LOCK_MS = 5000 // 5 second lock window for conflict resolution

// ── Auth ─────────────────────────────────────────────────────────────────────

let sheetsClient: sheets_v4.Sheets | null = null

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets credentials not configured. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SheetJobRow {
  jobNo: string
  type: string
  start: string    // dd-MMM or dd/mm/yy format from sheet
  comp: string     // calculated completion date
  days: number
  position: number // row index within the block
}

interface SyncSummary {
  created: number
  updated: number
  deleted: number
  errors: string[]
}

// ── Date format conversion ───────────────────────────────────────────────────
// Sheet uses "11-Mar" format, app uses "dd/mm/yy" format

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function sheetDateToAppDate(sheetDate: string): string {
  if (!sheetDate) return ''
  // Handle "11-Mar" format (assumes current year)
  const match = sheetDate.match(/^(\d{1,2})-([A-Za-z]{3})$/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const monthIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === match[2].toLowerCase())
    if (monthIdx === -1) return ''
    const month = (monthIdx + 1).toString().padStart(2, '0')
    const year = new Date().getFullYear().toString().slice(-2)
    return `${day}/${month}/${year}`
  }
  // Handle "dd/mm/yy" format (already correct)
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(sheetDate)) return sheetDate
  return ''
}

function appDateToSheetDate(appDate: string): string {
  if (!appDate) return ''
  // Convert "dd/mm/yy" to "dd-MMM" format
  const parts = appDate.split('/')
  if (parts.length !== 3) return appDate
  const day = parseInt(parts[0])
  const monthIdx = parseInt(parts[1]) - 1
  if (monthIdx < 0 || monthIdx > 11) return appDate
  return `${day}-${MONTH_NAMES[monthIdx]}`
}

// ── Read from Sheet ──────────────────────────────────────────────────────────

export async function readWorkerFromSheet(block: SheetWorkerBlock): Promise<SheetJobRow[]> {
  const sheets = await getSheetsClient()
  const range = `'${SHEET_TAB_SCHEDULE}'!${block.colJobNo}${block.dataStartRow}:${block.colDays}${block.dataEndRow}`

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  })

  const rows = res.data.values || []
  const jobs: SheetJobRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const jobNo = (row[0] || '').toString().trim()
    if (!jobNo) continue // skip empty rows

    jobs.push({
      jobNo,
      type: (row[1] || '').toString().trim(),
      start: sheetDateToAppDate((row[2] || '').toString().trim()),
      comp: (row[3] || '').toString().trim(),
      days: parseInt(row[4]) || 1,
      position: jobs.length, // sequential position
    })
  }

  return jobs
}

export async function readAllWorkersFromSheet(): Promise<Map<string, SheetJobRow[]>> {
  const result = new Map<string, SheetJobRow[]>()

  for (const block of SHEET_WORKER_BLOCKS) {
    const jobs = await readWorkerFromSheet(block)
    const existing = result.get(block.workerId) || []
    // If worker has multiple blocks (e.g. Ben), merge jobs
    result.set(block.workerId, [...existing, ...jobs])
  }

  return result
}

// ── Write to Sheet ───────────────────────────────────────────────────────────

export async function writeWorkerToSheet(
  block: SheetWorkerBlock,
  jobs: Array<{ jobNo: string; type: string; start: string; days: number }>
): Promise<void> {
  const sheets = await getSheetsClient()

  const totalRows = block.dataEndRow - block.dataStartRow + 1
  const values: (string | number)[][] = []

  for (const job of jobs) {
    const sheetStart = appDateToSheetDate(job.start)
    const sheetComp = appDateToSheetDate(compDate(job.start, job.days))
    values.push([job.jobNo, job.type, sheetStart, sheetComp, job.days])
  }

  // Pad with empty rows to clear old data
  while (values.length < totalRows) {
    values.push(['', '', '', '', ''])
  }

  // Truncate if more jobs than rows available
  const writeValues = values.slice(0, totalRows)

  const range = `'${SHEET_TAB_SCHEDULE}'!${block.colJobNo}${block.dataStartRow}:${block.colDays}${block.dataEndRow}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: writeValues },
  })
}

// ── Sync: App → Sheet ────────────────────────────────────────────────────────

export async function syncWorkerToSheet(workerId: string): Promise<void> {
  if (!SPREADSHEET_ID) return // sheets not configured

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: { jobs: { orderBy: { position: 'asc' } } },
  })
  if (!worker) return

  const blocks = findBlocksForWorker(workerId)
  if (blocks.length === 0) return // worker not mapped to sheet

  // Mark sync lock so webhook ignores the change we're about to make
  await markAppWrite(workerId)

  // For workers with a single block, write all jobs
  // For workers with multiple blocks (e.g. Ben), split jobs across blocks
  if (blocks.length === 1) {
    await writeWorkerToSheet(blocks[0], worker.jobs)
  } else {
    // Distribute jobs across blocks — fill first block, overflow to next
    let jobIdx = 0
    for (const block of blocks) {
      const blockCapacity = block.dataEndRow - block.dataStartRow + 1
      const blockJobs = worker.jobs.slice(jobIdx, jobIdx + blockCapacity)
      await writeWorkerToSheet(block, blockJobs)
      jobIdx += blockCapacity
    }
  }

  // Update sync metadata
  await prisma.worker.update({
    where: { id: workerId },
    data: { lastSyncAt: new Date(), lastSyncSource: 'app' },
  })

  await logSync(workerId, 'app-to-sheet', 'success', '', worker.jobs.length)
}

// ── Sync: Sheet → App ────────────────────────────────────────────────────────

export async function syncSheetToWorker(workerId: string): Promise<SyncSummary> {
  const summary: SyncSummary = { created: 0, updated: 0, deleted: 0, errors: [] }

  const blocks = findBlocksForWorker(workerId)
  if (blocks.length === 0) return summary

  // Read all jobs from sheet for this worker (may span multiple blocks)
  let allSheetJobs: SheetJobRow[] = []
  for (const block of blocks) {
    const blockJobs = await readWorkerFromSheet(block)
    allSheetJobs = [...allSheetJobs, ...blockJobs]
  }

  // Re-index positions
  allSheetJobs = allSheetJobs.map((j, i) => ({ ...j, position: i }))

  // Get current database state
  const dbJobs = await prisma.workerJob.findMany({
    where: { workerId },
    orderBy: { position: 'asc' },
  })

  // Reconcile
  await prisma.$transaction(async (tx: any) => {
    const sheetJobNos = new Set(allSheetJobs.map((j: any) => j.jobNo).filter(Boolean))

    // Delete jobs no longer in sheet
    const toDelete = dbJobs.filter((j: any) => j.jobNo && !sheetJobNos.has(j.jobNo))
    for (const j of toDelete) {
      await tx.workerJob.delete({ where: { id: j.id } })
      summary.deleted++
    }

    // Upsert jobs from sheet
    for (const sj of allSheetJobs) {
      if (!sj.jobNo) continue
      const existing = dbJobs.find((j: any) => j.jobNo === sj.jobNo)

      if (existing) {
        await tx.workerJob.update({
          where: { id: existing.id },
          data: {
            type: sj.type,
            start: sj.start,
            days: sj.days,
            position: sj.position,
          },
        })
        summary.updated++
      } else {
        await tx.workerJob.create({
          data: {
            workerId,
            jobNo: sj.jobNo,
            type: sj.type,
            start: sj.start,
            days: sj.days,
            position: sj.position,
          },
        })
        summary.created++
      }
    }

    await tx.worker.update({
      where: { id: workerId },
      data: { lastSyncAt: new Date(), lastSyncSource: 'sheet' },
    })
  })

  await logSync(workerId, 'sheet-to-app', 'success', '', allSheetJobs.length)
  return summary
}

// ── Full Sync ────────────────────────────────────────────────────────────────

export async function fullSync(): Promise<{ total: SyncSummary; perWorker: Record<string, SyncSummary> }> {
  const total: SyncSummary = { created: 0, updated: 0, deleted: 0, errors: [] }
  const perWorker: Record<string, SyncSummary> = {}

  // Get unique worker IDs from config
  const workerIdSet = new Set(SHEET_WORKER_BLOCKS.map((b) => b.workerId))
  const workerIds = Array.from(workerIdSet)

  for (const workerId of workerIds) {
    try {
      const ws = await syncSheetToWorker(workerId)
      perWorker[workerId] = ws
      total.created += ws.created
      total.updated += ws.updated
      total.deleted += ws.deleted
      total.errors.push(...ws.errors)

      // After pulling from sheet, push back to sheet to ensure COMP dates are correct
      await syncWorkerToSheet(workerId)
    } catch (err: any) {
      const msg = `${workerId}: ${err.message}`
      total.errors.push(msg)
      perWorker[workerId] = { created: 0, updated: 0, deleted: 0, errors: [msg] }
    }
  }

  return { total, perWorker }
}

// ── Conflict Resolution ──────────────────────────────────────────────────────

export async function markAppWrite(workerId: string): Promise<void> {
  await prisma.worker.update({
    where: { id: workerId },
    data: { lastSyncAt: new Date(), lastSyncSource: 'app' },
  })
}

export async function isRecentAppWrite(workerId: string): Promise<boolean> {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { lastSyncAt: true, lastSyncSource: true },
  })
  if (!worker?.lastSyncAt || worker.lastSyncSource !== 'app') return false
  return Date.now() - worker.lastSyncAt.getTime() < SYNC_LOCK_MS
}

// ── Identify affected workers from webhook ───────────────────────────────────

export function identifyAffectedWorkers(row: number, col: number): string[] {
  const block = findBlockByCell(row, col)
  if (!block) return []
  return [block.workerId]
}

// ── Sync Logging ─────────────────────────────────────────────────────────────

async function logSync(
  workerId: string,
  direction: string,
  status: string,
  detail: string = '',
  jobCount: number = 0
): Promise<void> {
  try {
    await prisma.syncLog.create({
      data: { workerId, direction, status, detail, jobCount },
    })
  } catch {
    // Don't let logging failures break sync
  }
}

export async function getRecentSyncLogs(limit: number = 20) {
  return prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
