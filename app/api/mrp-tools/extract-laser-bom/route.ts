import { NextRequest, NextResponse } from 'next/server'
import { drive_v3 } from 'googleapis'
import { getDriveClient } from '@/lib/drive'
import { extractPdfText } from '@/lib/extractPdfText'
import { parseDxf } from '@/lib/dxfParse'
import { parseTitleBlock } from '@/lib/laserTitleBlock'
import { mapMaterialCode } from '@/lib/laserMaterialCodes'

export const runtime    = 'nodejs'
export const maxDuration = 300

const COLUMNS = [
  'part_no', 'revision', 'description', 'material_text', 'material_code',
  'sheet_thickness_mm', 'sheet_length_mm', 'sheet_width_mm',
  'bbox_length_mm', 'bbox_width_mm', 'perimeter_mm',
]

type FileMeta = { id: string; name: string; mimeType: string }

async function listFolder(
  drive: drive_v3.Drive,
  folderId: string,
  recursive: boolean,
): Promise<FileMeta[]> {
  const files: FileMeta[] = []
  const queue = [folderId]
  while (queue.length) {
    const fid = queue.pop()!
    let pageToken: string | undefined
    do {
      const res = await drive.files.list({
        q: `'${fid}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })
      for (const f of res.data.files ?? []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          if (recursive) queue.push(f.id!)
        } else {
          files.push({ id: f.id!, name: f.name!, mimeType: f.mimeType! })
        }
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)
  }
  return files
}

function stripExt(name: string): string {
  return name.replace(/\.(dxf|pdf)$/i, '')
}

function isDxf(f: FileMeta): boolean {
  return f.name.toLowerCase().endsWith('.dxf') || f.mimeType === 'application/dxf'
}

function isPdf(f: FileMeta): boolean {
  return f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf'
}

function pairFiles(files: FileMeta[]): Array<{ part: string; dxf: FileMeta; pdf: FileMeta }> {
  const byPart: Record<string, { dxf?: FileMeta; pdf?: FileMeta }> = {}
  for (const f of files) {
    if (!isDxf(f) && !isPdf(f)) continue
    const kind = isDxf(f) ? 'dxf' : 'pdf'
    const part = stripExt(f.name)
    byPart[part] ??= {}
    byPart[part][kind] = f
  }
  return Object.entries(byPart)
    .filter(([, k]) => k.dxf && k.pdf)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([part, k]) => ({ part, dxf: k.dxf!, pdf: k.pdf! }))
}

async function downloadBuffer(drive: drive_v3.Drive, fileId: string): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  )
  return Buffer.from(res.data as unknown as ArrayBuffer)
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function toCsvRow(row: Record<string, string | number>): string {
  return COLUMNS.map(col => csvCell(row[col] ?? '')).join(',')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { folderId?: string; recursive?: boolean; limit?: number }
    const folderId = body.folderId || '15mg2nsgwGNDJH8mMxS7dDhmZpKIFCLAl'
    const recursive = body.recursive ?? false
    const limit     = body.limit ?? undefined

    const drive = await getDriveClient()
    const files = await listFolder(drive, folderId, recursive)
    let pairs = pairFiles(files)
    if (limit) pairs = pairs.slice(0, limit)

    const rows: Record<string, string | number>[] = []
    const failures: string[] = []
    let unknownCodes = 0

    for (const { part, dxf, pdf } of pairs) {
      try {
        const [dxfBuf, pdfBuf] = await Promise.all([
          downloadBuffer(drive, dxf.id),
          downloadBuffer(drive, pdf.id),
        ])

        const geo = parseDxf(dxfBuf.toString('utf8'))
        const tb  = parseTitleBlock(await extractPdfText(pdfBuf))
        const code = mapMaterialCode(tb.materialText, tb.sheetThicknessMm)

        if (!code) unknownCodes++

        const dotIdx  = part.lastIndexOf('.')
        const revision = dotIdx >= 0 ? part.slice(dotIdx + 1) : ''
        const partNo   = dotIdx >= 0 ? part.slice(0, dotIdx) : part

        rows.push({
          part_no:            partNo,
          revision,
          description:        tb.description,
          material_text:      tb.materialText,
          material_code:      code,
          sheet_thickness_mm: tb.sheetThicknessMm ?? '',
          sheet_length_mm:    tb.sheetLengthMm    ?? '',
          sheet_width_mm:     tb.sheetWidthMm     ?? '',
          bbox_length_mm:     geo.bboxLength      ?? '',
          bbox_width_mm:      geo.bboxWidth       ?? '',
          perimeter_mm:       geo.perimeterMm,
        })
      } catch (err) {
        failures.push(`${part}: ${err instanceof Error ? err.message : String(err)}`)
        console.error(`extract-laser-bom: failed ${part}:`, err)
      }
    }

    const csv = [COLUMNS.join(','), ...rows.map(toCsvRow)].join('\n')
    const stats = encodeURIComponent(JSON.stringify({
      totalPairs:   pairs.length,
      rowsProduced: rows.length,
      failures:     failures.length,
      unknownCodes,
    }))

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="laser_bom.csv"',
        'X-Stats': stats,
        'Access-Control-Expose-Headers': 'X-Stats',
      },
    })
  } catch (err) {
    console.error('extract-laser-bom error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
