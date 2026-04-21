// ─────────────────────────────────────────────────────────────────────────────
// YLZ — Job Kick-off Agent
//
// Triggered automatically when a quote is accepted and a new job is created.
// Runs fully automated — finds engineering files in Drive, identifies long
// lead-time parts, populates the draft parts order, notifies Chris.
//
// Chris's only action: review and advance the job to "Ready to Start".
// That single tap notifies Liz to raise purchase orders in MRPeasy.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from './prisma'
import { resolveBoms } from './bom-resolver'
import {
  BODY_KITS_FOLDER_ID,
  GENERIC_DESIGNS_ROOT_ID,
  ALUMINIUM_BODY_KITS_PATH,
  findChildFolder,
  findFolderByPrefix,
  findFolderByPath,
  findFileInFolder,
  findJobFolder,
  downloadJsonFile,
  listFolderFiles,
  downloadDriveFile,
} from './drive'
import { extractPdfText } from './extractPdfText'
import { extractMaterialFromText } from './work-order/extract-material'

// BOM categories that are long lead-time and must be ordered immediately
const LONG_LEAD_CATEGORIES = new Set(['Truck Tarp', 'Towbar', 'Hoist', 'PTO', 'Running Gear'])
const TRAILER_LONG_LEAD_CATEGORIES = new Set(['Trailer Tarp', 'Running Gear', 'Drawbar'])

// Tarp is always 400mm shorter than the body
const TARP_DEDUCTION_MM = 400

// ── Trailer Drive folder IDs ──────────────────────────────────────────────────
// Generic Designs > Trailer Chassis
const TRAILER_CHASSIS_FOLDER_ID = '19Ec_gjHsR_7aeverVX0kAZUlNWPJsa3r'

// Generic Designs > [body folder] — keyed as `{axles}-ally` or `{axles}-steel`
const TRAILER_BODY_FOLDER_IDS: Record<string, string> = {
  '3-ally':  '1tvB-NsnN_tayknVYCAuhvx4WbnPR4Q58',  // Aluminium Body - Well Mount
  '4-ally':  '1FwuSp3MxxiwwGuNNTctULo4VkOc6SlVK',  // Aluminium Body - 4-Axle - Well Mount
  '6-ally':  '1mF6KuWPdZyWuQeqXyWj3kPahWk5kYMmj',  // Aluminium Body - 6-Axle - Well Mount
  '3-steel': '1WiXTjJvvr7gDJmVSSZXsYVdzNcnnyn0y',  // Steel Body - 3-Axle - Well Mount
}

// Chassis subfolders — keyed by chassis length code derived from body length
const CHASSIS_FOLDER_IDS: Record<string, string> = {
  '3-dog-4930':  '1aE-UsQHO9c8LxQmCr8rb7QW2J73lsTSY',  // 3-Axle Dog Rear (4930mm) — suits 5300–5400 body
  '3-dog-5450':  '1RuYqFKMyl9HLVMBI46c_Fqnee_gDRXkk',  // 3-Axle Dog Rear (5450mm) — suits 6000–6100 body
  '3-lead':      '1FxHe880La2Vrreys9H9Zmy_qC0OMuBfJ',  // 3-Axle Lead Trailer
  '4-dog-7470':  '1dtlpVv9ydwArduvQJSs9z4KhSckrdA_N',  // 4-Axle Dog Rear (7470mm) — suits 7700 body
  '4-dog-7870':  '1ZuK4QM_gyRjGrYnC9gEtoozRCWliRbfz',  // 4-Axle Dog Rear (7870mm) — suits 8300 body
  '5-dog-8950':  '1y-j0yDZvTO6sAwA2h7shUy7dHCIw552x',  // 5-Axle Dog Rear (8950mm) — suits 9200–9600 body
  '6-dog-9450':  '1RumEmUwb5Pb6hoLfcnu4aUK0rkd4F97e',  // 6-Axle Dog Rear (9450mm) — suits 10200 body
  '3-semi-9100': '1RSsWdTmRGvbjm2q7l2KgvI2PNp64NHDI',  // 3-Axle Semi Rear Drop (suit 9100 Body)
  '3-semi-10200':'1SNHwZcW1kB6qF9GNmh6HUuT8tYBEoLJ5',  // 3-Axle Semi Rear Drop (suit 10200 Body)
}

function getChassisKey(axles: number, modelType: string, bodyLength: number): string | null {
  if (modelType === 'dog') {
    if (axles === 3) return bodyLength <= 5400 ? '3-dog-4930' : '3-dog-5450'
    if (axles === 4) return bodyLength <= 7700 ? '4-dog-7470' : '4-dog-7870'
    if (axles === 5) return '5-dog-8950'
    if (axles === 6) return '6-dog-9450'
  }
  if (modelType === 'lead') return '3-lead'
  if (modelType === 'semi') return bodyLength <= 9100 ? '3-semi-9100' : '3-semi-10200'
  return null
}

interface KitFiles {
  kitName: string
  cadFolderId: string | null
  drawingsFolderId: string | null
  dxfFolderId: string | null
  pdfFolderId: string | null
  dxfFolderUrl: string | null
  pdfFolderUrl: string | null
  massKg: number
}

interface LongLeadItem {
  partNumber: string
  description: string
  quantity: number
}

// ── Drive navigation ──────────────────────────────────────────────────────────

export async function findKitFiles(bodyLength: number, bodyHeight: number, isHardox: boolean): Promise<KitFiles | null> {
  const prefix = `YLZ${bodyLength}x${bodyHeight}`
  const matCode = isHardox ? 'H' : 'A'
  const kitName = `${prefix}-${matCode}-WM`

  // Strategy 1: search directly under BODY_KITS_FOLDER_ID by dimension prefix —
  // covers both Hardox (YLZ4600x1000-H-WM) and Aluminium (YLZ4600x1000-A-WM or YLZ4600x1000-AL)
  // without requiring a material subfolder to exist.
  let kitFolderId = await findFolderByPrefix(BODY_KITS_FOLDER_ID, prefix)

  // Strategy 2: fall back to the old material subfolder layout (Hardox / Aluminium)
  if (!kitFolderId) {
    const matFolder = isHardox ? 'Hardox' : 'Aluminium'
    const matFolderId = await findChildFolder(BODY_KITS_FOLDER_ID, matFolder)
    if (matFolderId) {
      kitFolderId = await findFolderByPrefix(matFolderId, prefix)
    }
  }

  // Strategy 3: For aluminium kits, also search the Generic Designs shared drive
  // (G:\.shortcut-targets-by-id\11I4WxzE7drzxHwG58yG6I8nV2l5tl3KM\YLZ\Engineering\Generic Designs\Body Kits\Aluminium)
  if (!kitFolderId && !isHardox) {
    try {
      const alumFolder = await findFolderByPath(GENERIC_DESIGNS_ROOT_ID, ALUMINIUM_BODY_KITS_PATH)
      if (alumFolder) {
        kitFolderId = await findFolderByPrefix(alumFolder, prefix)
      }
    } catch { /* non-fatal */ }
  }

  if (!kitFolderId) return null

  // Hardox kits:    kit / CAD / Drawings / DXF  (CAD subfolder exists)
  // Aluminium kits: kit / Drawings / DXF         (no CAD subfolder)
  const cadFolderId = await findChildFolder(kitFolderId, 'CAD')
  const drawingsFolderId = cadFolderId
    ? await findChildFolder(cadFolderId, 'Drawings')
    : await findChildFolder(kitFolderId, 'Drawings')

  if (!drawingsFolderId) return null

  const [dxfId, pdfId] = await Promise.all([
    findChildFolder(drawingsFolderId, 'DXF'),
    findChildFolder(drawingsFolderId, 'PDF'),
  ])

  // Read metadata.json for mass and specs (only present in Hardox CAD folders)
  let massKg = 0
  let resolvedKitName = kitName
  try {
    const metaSearchId = cadFolderId ?? kitFolderId
    const metaId = await findFileInFolder(metaSearchId, 'metadata.json')
    if (metaId) {
      const meta = await downloadJsonFile(metaId)
      massKg = Math.round((meta.mass_kg as number) ?? 0)
      if (typeof meta.kit_name === 'string') resolvedKitName = meta.kit_name
    }
  } catch { /* non-fatal */ }

  return {
    kitName: resolvedKitName,
    cadFolderId,
    drawingsFolderId,
    dxfFolderId: dxfId,
    pdfFolderId: pdfId,
    dxfFolderUrl: dxfId ? `https://drive.google.com/drive/folders/${dxfId}` : null,
    pdfFolderUrl: pdfId ? `https://drive.google.com/drive/folders/${pdfId}` : null,
    massKg,
  }
}

// ── Long lead-time item display names ─────────────────────────────────────────

function buildDisplayName(category: string, bomName: string, bodyLength: number, isPVC: boolean): string {
  if ((category === 'Truck Tarp' || category === 'Trailer Tarp') && bodyLength > 0) {
    const tarpLength = bodyLength - TARP_DEDUCTION_MM
    return `Tarp ${isPVC ? 'PVC' : 'Mesh'} — ${tarpLength.toLocaleString()}mm`
  }
  return bomName
}

// ── Work Order generation ────────────────────────────────────────────────

export async function generateWorkOrder(
  jobId: string, jobNum: string, customer: string,
  kitName: string, dxfFolderId: string | null, pdfFolderId: string | null,
  drawingsFolderId?: string | null,
): Promise<void> {
  if (!dxfFolderId) return

  // ── 1. List DXF and PDF files (flat + one level of non-Archive subfolders) ─
  const FOLDER_MIME = 'application/vnd.google-apps.folder'
  const isArchiveFolder = (f: { name: string; mimeType: string }) =>
    f.mimeType === FOLDER_MIME && f.name.toLowerCase() === 'archive'

  /**
   * List all files in a folder plus files inside any non-Archive subfolders
   * (two levels deep). This picks up revised files stored in subfolders like
   * "B Revision" while still excluding any "Archive" subfolder.
   */
  async function listFolderFilesShallow(folderId: string) {
    const items = await listFolderFiles(folderId)
    const files = items.filter(f => f.mimeType !== FOLDER_MIME)
    const subfolders = items.filter(f => f.mimeType === FOLDER_MIME && !isArchiveFolder(f))
    if (subfolders.length === 0) return files
    // Level 1
    const level1 = await Promise.all(subfolders.map(sf => listFolderFiles(sf.id)))
    const level1Files = level1.flat().filter(f => f.mimeType !== FOLDER_MIME && !isArchiveFolder(f))
    const level1Folders = level1.flat().filter(f => f.mimeType === FOLDER_MIME && !isArchiveFolder(f))
    if (level1Folders.length === 0) return [...files, ...level1Files]
    // Level 2
    const level2 = await Promise.all(level1Folders.map(sf => listFolderFiles(sf.id)))
    const level2Files = level2.flat().filter(f => f.mimeType !== FOLDER_MIME && !isArchiveFolder(f))
    return [...files, ...level1Files, ...level2Files]
  }

  const [dxfFiles, pdfSubFiles, drawingsFiles] = await Promise.all([
    listFolderFilesShallow(dxfFolderId),
    pdfFolderId ? listFolderFilesShallow(pdfFolderId) : Promise.resolve([]),
    drawingsFolderId ? listFolderFiles(drawingsFolderId).then(items => items.filter(f => f.mimeType !== FOLDER_MIME && !isArchiveFolder(f))) : Promise.resolve([]),
  ])

  if (dxfFiles.length === 0) return

  // ── 2. Build PDF lookup by stem ───────────────────────────────────────────
  // pdfSubFiles (PDF/ subfolder) wins over drawingsFiles for same stem.
  const pdfByName = new Map<string, typeof pdfSubFiles[0]>()
  for (const f of [...drawingsFiles, ...pdfSubFiles]) {
    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.pdf') && f.mimeType !== 'application/pdf') continue
    const stem = f.name.replace(/\.[^.]+$/, '').replace(/\.[A-Za-z]$/, '').toUpperCase()
    pdfByName.set(stem, f)
  }

  // ── 3. Download each individual part PDF and extract material ─────────────
  // Matches the Python work_order_generator.py approach: for each DXF file,
  // find the matching PDF (same filename stem), download it, and extract
  // material from the SolidWorks title block using pdfplumber-equivalent
  // position-sorted text extraction. Quantity defaults to 1 (same as Python).
  const sortedDxf = [...dxfFiles].sort((a, b) => a.name.localeCompare(b.name))

  interface PartInfo { material: string; thickness: string; hasFlatPattern: boolean }
  const materialMap = new Map<string, PartInfo>()

  await Promise.all(sortedDxf.map(async (dxf) => {
    const stem = dxf.name.replace(/\.[^.]+$/, '').replace(/\.[A-Za-z]$/, '').toUpperCase()
    const pdf = pdfByName.get(stem)
    if (!pdf) return
    try {
      const { buffer } = await downloadDriveFile(pdf.id)
      const text = await extractPdfText(buffer)
      const info = extractMaterialFromText(text)
      materialMap.set(stem, info)
    } catch { /* non-fatal — part will show Unknown */ }
  }))

  // ── 4. Build parts list ───────────────────────────────────────────────────
  const parts = sortedDxf.map((dxf, idx) => {
      const stem = dxf.name.replace(/\.[^.]+$/, '').replace(/\.[A-Za-z]$/, '').toUpperCase()
      const matchedPdf = pdfByName.get(stem)
      const info = materialMap.get(stem)

      return {
        partName: dxf.name.replace(/\.[^.]+$/, ''),
        material: info?.material ?? 'Unknown',
        thickness: info?.thickness ?? '',
        hasFlatPattern: info?.hasFlatPattern ?? false,
        quantity: 1,
        dxfFileId: dxf.id,
        pdfFileId: matchedPdf?.id ?? '',
        dxfFileName: dxf.name,
        pdfFileName: matchedPdf?.name ?? '',
        thumbnailUrl: '',
        sortOrder: idx,
      }
    })

  await prisma.workOrder.create({
    data: {
      jobId,
      jobNum,
      kitName,
      customer,
      dxfFolderId: dxfFolderId ?? '',
      pdfFolderId: pdfFolderId ?? '',
      parts: { create: parts },
    },
  })
}

// ── Job Drawings generation ──────────────────────────────────────────────────

export async function generateJobDrawings(
  jobId: string,
  cadFolderId: string | null,
  drawingsFolderId: string | null,
  pdfFolderId: string | null,
  jobNum?: string,
): Promise<void> {
  // Delete existing drawings for this job (re-generate)
  await prisma.jobDrawing.deleteMany({ where: { jobId } })

  const drawings: Array<{
    fileName: string; driveFileId: string; type: string
    category: string; thumbnailUrl: string; mimeType: string; sortOrder: number
  }> = []
  const seenFileIds = new Set<string>()

  let order = 0

  const addFile = (f: { id: string; name: string; mimeType: string; thumbnailLink?: string }, type: string, category: string) => {
    if (seenFileIds.has(f.id)) return
    seenFileIds.add(f.id)
    drawings.push({
      fileName: f.name,
      driveFileId: f.id,
      type,
      category,
      thumbnailUrl: f.thumbnailLink || '',
      mimeType: type === 'step' ? 'application/step' : 'application/pdf',
      sortOrder: order++,
    })
  }

  // 1. Scan Drawings folder for PDFs NOT inside the PDF subfolder (these are assembly drawings)
  if (drawingsFolderId) {
    const drawingFiles = await listFolderFiles(drawingsFolderId)
    for (const f of drawingFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue
      if (f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        addFile(f, 'assembly', categoriseDrawing(f.name))
      }
    }
  }

  // 2. Scan CAD folder for PDFs and STEP files at root level
  if (cadFolderId) {
    const cadFiles = await listFolderFiles(cadFolderId)
    for (const f of cadFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue
      const lower = f.name.toLowerCase()
      if (lower.endsWith('.pdf') || f.mimeType === 'application/pdf') {
        addFile(f, 'assembly', categoriseDrawing(f.name))
      } else if (lower.endsWith('.step') || lower.endsWith('.stp')) {
        addFile(f, 'step', 'tube-laser')
      }
    }
  }

  // 3. Scan the job's own Google Drive folder (Job Sheets) for drawings and STEP files
  if (jobNum) {
    try {
      const jobFolderId = await findJobFolder(jobNum)
      if (jobFolderId) {
        await scanFolderRecursive(jobFolderId, 0)
      }
    } catch { /* non-fatal — Drive may not have a folder for this job */ }
  }

  async function scanFolderRecursive(folderId: string, depth: number, folderName = ''): Promise<void> {
    if (depth > 3) return // limit recursion depth
    const files = await listFolderFiles(folderId)
    const inCadFolder = folderName.toUpperCase() === 'CAD'
    for (const f of files) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        await scanFolderRecursive(f.id, depth + 1, f.name)
        continue
      }
      const lower = f.name.toLowerCase()
      if (lower.endsWith('.step') || lower.endsWith('.stp')) {
        addFile(f, 'step', 'tube-laser')
      } else if (lower.endsWith('.pdf') || f.mimeType === 'application/pdf') {
        // Always include PDFs from a CAD folder or _BW/_BF body drawings
        const isBwBf = lower.endsWith('_bw.pdf') || lower.endsWith('_bf.pdf')
        const hasKeyword = lower.includes('drawing') || lower.includes('assy') || lower.includes('assembly') ||
          lower.includes('subframe') || lower.includes('body') || lower.includes('hoist') || lower.includes('tailgate')
        if (inCadFolder || isBwBf || hasKeyword) {
          addFile(f, 'assembly', categoriseDrawing(f.name))
        }
      }
    }
  }

  if (drawings.length === 0) return

  await prisma.jobDrawing.createMany({ data: drawings.map(d => ({ ...d, jobId })) })
}

/** Guess drawing category from filename */
function categoriseDrawing(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('subframe') || lower.includes('sub-frame') || lower.includes('sub frame')) return 'subframe'
  if (lower.includes('tailgate') || lower.includes('tail gate') || lower.includes('tail-gate')) return 'tailgate'
  if (lower.includes('hoist')) return 'hoist'
  if (lower.includes('chassis')) return 'chassis'
  if (lower.includes('assembly') || lower.includes('assy')) return 'assembly'
  if (lower.includes('body')) return 'body'
  if (lower.includes('headboard') || lower.includes('head board')) return 'headboard'
  if (lower.includes('ramp')) return 'ramp'
  return 'body'
}

// ── VASS Booking auto-generation ─────────────────────────────────────────────

async function generateDraftVass(
  jobId: string, jobNum: string, customerName: string, quoteId: string,
  cfg: Record<string, string>,
): Promise<void> {
  // Don't duplicate — skip if one already exists for this job number
  const existing = await prisma.vassBooking.findFirst({ where: { jobNumber: jobNum } })
  if (existing) return

  const chassisMake = cfg.chassisMake || ''
  const chassisModel = cfg.chassisModel || ''
  const vin = cfg.vin || cfg.truckVin || ''
  const gvm = cfg.gvm || cfg.truckGvm || ''
  const gcm = cfg.gcm || cfg.trailerGcm || ''

  // Look up chassis specs from VassChassis table
  let seats = '', frontAxle = '', rearAxle = ''
  if (chassisMake && chassisModel) {
    const chassis = await prisma.vassChassis.findFirst({
      where: { make: chassisMake, model: chassisModel },
    })
    if (chassis) {
      seats = chassis.seatingCapacity || ''
      frontAxle = chassis.frontAxleRating || ''
      rearAxle = chassis.rearAxleRating || ''
      // Use DB values if not in quote config
      if (!gvm && chassis.gvm) gvm === chassis.gvm
      if (!gcm && chassis.gcm) gcm === chassis.gcm
    }
  }

  await prisma.vassBooking.create({
    data: {
      jobNumber: jobNum,
      quoteId,
      status: 'draft',
      bookingDate: new Date().toISOString().split('T')[0],
      requestedBy: 'Nathan Yarnold',
      companyAddress: '31 Gatwick Rd, Bayswater North VIC 3153',
      companyState: 'VIC',
      companyPostcode: '3153',
      companyEmail: 'nathan@ylztruckbodies.com',
      companyPhone: '03 9720 1038',
      ownerName: customerName,
      vehicleMake: chassisMake,
      vehicleModel: chassisModel,
      vinNumber: vin,
      gvm: gvm || '',
      gcm: gcm || '',
      seats,
      frontAxleRating: frontAxle,
      rearAxleRating: rearAxle,
      modDescription: `Body build — ${cfg.bodyLength || ''}mm ${cfg.material || ''} ${cfg.bodyHeight || ''}mm walls`.trim(),
    },
  })
}

// ── Main agent ────────────────────────────────────────────────────────────────

export async function runKickoffAgent(jobId: string, quoteId: string): Promise<void> {
  const [job, quote] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.quote.findUnique({ where: { id: quoteId } }),
  ])
  if (!job || !quote) return

  const cfg = (quote.configuration ?? {}) as Record<string, string>

  // Extract dimensions from quote config
  // Kit naming uses wall HEIGHT (1000/1100mm), not internal body width
  const material = (cfg.material || cfg.truckMaterial || '').toLowerCase()
  const bodyLength = parseInt((cfg.bodyLength || cfg.truckBodyLength || '0').replace(/[^\d]/g, ''), 10)
  const bodyHeight = parseInt((cfg.bodyHeight || cfg.truckBodyHeight || '0').replace(/[^\d]/g, ''), 10)

  const isHardox = material.includes('hardox')
  const isAluminium = material.includes('alumin') || material.includes('alloy')
  const hasKitSupport = (isHardox || isAluminium) && bodyLength > 0 && bodyHeight > 0

  // ── Find kit files in Drive ──
  let kitFiles: KitFiles | null = null
  let noKitReason: string | null = null

  if (hasKitSupport) {
    try {
      kitFiles = await findKitFiles(bodyLength, bodyHeight, isHardox)
      if (!kitFiles) {
        const matCode = isHardox ? 'H' : 'A'
        noKitReason = `No standard kit found for YLZ${bodyLength}x${bodyHeight}-${matCode}-WM`
      }
    } catch {
      noKitReason = 'Drive lookup failed — check Google credentials'
    }
  } else {
    noKitReason = bodyLength === 0 || bodyHeight === 0
      ? 'Missing body dimensions in quote config'
      : `No kit library for build type: ${quote.buildType}`
  }

  // ── Resolve long lead-time BOMs ──
  const allBoms = resolveBoms(quote.buildType, cfg as Record<string, unknown>)
  const longLeadBoms = allBoms.filter(b => LONG_LEAD_CATEGORIES.has(b.category))

  const tarpInfo = (cfg.tarpSystem || cfg.truckTarpMaterial || cfg.truckTarp || '').toLowerCase()
  const isPVC = tarpInfo.includes('pvc') || !tarpInfo.includes('mesh')

  const longLeadItems: LongLeadItem[] = longLeadBoms.map(b => ({
    partNumber: b.code,
    description: buildDisplayName(b.category, b.name, bodyLength, isPVC),
    quantity: 1,
  }))

  // ── Populate draft parts order ──
  if (longLeadItems.length > 0) {
    const existingOrder = await prisma.partsOrder.findFirst({
      where: { jobId, status: 'draft' },
    })
    if (existingOrder) {
      await prisma.partsOrderItem.createMany({
        data: longLeadItems.map(item => ({
          orderId: existingOrder.id,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          status: 'ordered',
        })),
      })
    }
  }

  // ── Build job note ──
  const lines: string[] = []

  if (kitFiles) {
    lines.push(`Kit: ${kitFiles.kitName}`)
    if (kitFiles.massKg) lines.push(`Mass: ${kitFiles.massKg.toLocaleString()}kg`)
    lines.push('')
    if (kitFiles.dxfFolderUrl) lines.push(`DXF files (laser cutting): ${kitFiles.dxfFolderUrl}`)
    if (kitFiles.pdfFolderUrl) lines.push(`PDF drawings: ${kitFiles.pdfFolderUrl}`)
  } else {
    lines.push(`⚠️ ${noKitReason}`)
    lines.push('Custom engineering required — drawings must be created manually.')
  }

  if (longLeadItems.length > 0) {
    lines.push('')
    lines.push('Long lead-time items added to parts order:')
    longLeadItems.forEach(item => lines.push(`  • ${item.description} (${item.partNumber})`))
  }

  lines.push('')
  lines.push('Review above and advance to Ready to Start when satisfied.')

  await prisma.jobNote.create({
    data: {
      jobId,
      authorId: 'system',
      authorName: 'Kick-off Agent',
      type: 'kickoff',
      message: lines.join('\n'),
    },
  })

  // ── Add to Cold Form — Hardox Kits tab ──
  if (kitFiles) {
    try {
      const last = await prisma.coldformKit.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
      await prisma.coldformKit.create({
        data: {
          size: kitFiles.kitName,
          allocatedTo: job.num,
          notes: kitFiles.dxfFolderUrl ? `DXF: ${kitFiles.dxfFolderUrl}` : '',
          position: (last?.position ?? 0) + 1,
        },
      })
    } catch { /* non-fatal */ }
  }

  // ── Find engineering team (Chris, Nathan, Jackson) ──
  const engineers = await prisma.user.findMany({
    where: { name: { in: ['CHRIS', 'Nathan', 'Jackson'], mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  // ── Create task (unassigned — any engineer can complete it) ──
  await prisma.jobTask.create({
    data: {
      jobId,
      title: kitFiles
        ? `Review engineering pack & parts order — advance to Ready to Start`
        : `Custom engineering required — create drawings, then advance to Ready to Start`,
      assignedTo: '',
      sortOrder: 0,
    },
  })

  // ── Notify all engineers ──
  const notifMessage = kitFiles
    ? `${job.num} kick-off ready — kit found, ${longLeadItems.length} long lead-time item${longLeadItems.length !== 1 ? 's' : ''} flagged. Review and advance.`
    : `${job.num} needs custom engineering — ${noKitReason}`

  if (engineers.length) {
    await prisma.notification.createMany({
      data: engineers.map((u: any) => ({
        userId: u.id,
        jobId,
        jobNum: job.num,
        type: 'kickoff',
        message: notifMessage,
      })),
    })
  }

  // ── Generate Cold Form work order ──
  if (kitFiles) {
    try {
      await generateWorkOrder(jobId, job.num, job.customer, kitFiles.kitName, kitFiles.dxfFolderId, kitFiles.pdfFolderId, kitFiles.drawingsFolderId)
    } catch (e) {
      console.error('Work order generation failed:', e)
    }
    try {
      await generateJobDrawings(jobId, kitFiles.cadFolderId, kitFiles.drawingsFolderId, kitFiles.pdfFolderId, job.num)
    } catch (e) {
      console.error('Job drawings generation failed:', e)
    }
  }

  // ── Generate draft VASS booking ──
  try {
    await generateDraftVass(jobId, job.num, job.customer, quoteId, cfg)
  } catch (e) {
    console.error('VASS booking generation failed:', e)
  }
}

// ── Trailer Kick-off Agent ────────────────────────────────────────────────────
//
// Triggered when a trailer quote is accepted. Finds the body and chassis
// folders in Drive, resolves long lead-time parts, notifies Chris to review.
// Same downstream chain as trucks: Chris → advance → Liz → MRPeasy → Keith.
// ─────────────────────────────────────────────────────────────────────────────

export async function runTrailerKickoffAgent(jobId: string, quoteId: string): Promise<void> {
  const [job, quote] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.quote.findUnique({ where: { id: quoteId } }),
  ])
  if (!job || !quote) return

  const cfg = (quote.configuration ?? {}) as Record<string, string>
  const c = (key: string) => String(cfg[key] || '')
  const cNum = (key: string) => parseInt((cfg[key] || '0').replace(/[^\d]/g, ''), 10)

  // ── Extract trailer config ──
  const trailerModel = c('trailerModel')                   // e.g. 'DT-4 (4-Axle Dog)'
  const material = c('trailerMaterial') || c('material')
  const axles = cNum('trailerAxleCount') || cNum('axleCount')
  const bodyLength = cNum('trailerBodyLength') || cNum('bodyLength')

  const isAlly = material.toLowerCase().includes('alumin') || material.toLowerCase().includes('alloy')
  const mLower = trailerModel.toLowerCase()
  const modelType = mLower.includes('lead') ? 'lead'
    : mLower.includes('semi') ? 'semi'
    : mLower.includes('dolly') || mLower.includes('cd-') ? 'dolly'
    : 'dog'

  // ── Find body folder in Drive ──
  const bodyFolderKey = `${axles}-${isAlly ? 'ally' : 'steel'}`
  const bodyFolderId = TRAILER_BODY_FOLDER_IDS[bodyFolderKey] ?? null

  let bodyFolderUrl: string | null = null
  let dxfFolderUrl: string | null = null
  let pdfFolderUrl: string | null = null
  let trailerDxfFolderId: string | null = null
  let trailerPdfFolderId: string | null = null
  let trailerDrawingsFolderId: string | null = null
  let trailerBodyLookupId: string | null = null
  let noBodyReason: string | null = null

  if (bodyFolderId) {
    try {
      // 4-axle aluminium folders have length subfolders (e.g. "7700 Body")
      let lookupId = bodyFolderId
      if (axles === 4 && bodyLength > 0) {
        const lenFolder = await findChildFolder(bodyFolderId, `${bodyLength} Body`)
        if (lenFolder) lookupId = lenFolder
      }
      trailerBodyLookupId = lookupId
      bodyFolderUrl = `https://drive.google.com/drive/folders/${lookupId}`

      // Navigate to Drawings/DXF and Drawings/PDF
      const drawingsId = await findChildFolder(lookupId, 'Drawings')
      if (drawingsId) {
        trailerDrawingsFolderId = drawingsId
        const [dxfId, pdfId] = await Promise.all([
          findChildFolder(drawingsId, 'DXF'),
          findChildFolder(drawingsId, 'PDF'),
        ])
        trailerDxfFolderId = dxfId
        trailerPdfFolderId = pdfId
        if (dxfId) dxfFolderUrl = `https://drive.google.com/drive/folders/${dxfId}`
        if (pdfId) pdfFolderUrl = `https://drive.google.com/drive/folders/${pdfId}`
      }
    } catch {
      noBodyReason = 'Drive lookup failed — check Google credentials'
    }
  } else {
    noBodyReason = axles > 0
      ? `No standard body folder for ${axles}-axle ${material} trailer`
      : 'Missing axle count or material in quote config'
  }

  // ── Find chassis folder in Drive ──
  let chassisFolderUrl: string | null = null
  let noChassisReason: string | null = null

  if (modelType !== 'dolly') {
    const chassisKey = getChassisKey(axles, modelType, bodyLength)
    const chassisFolderId = chassisKey ? CHASSIS_FOLDER_IDS[chassisKey] : null
    if (chassisFolderId) {
      chassisFolderUrl = `https://drive.google.com/drive/folders/${chassisFolderId}`
    } else {
      noChassisReason = bodyLength > 0
        ? `No standard chassis for ${axles}-axle ${modelType} with ${bodyLength}mm body`
        : 'Missing body length in quote config — cannot determine chassis'
    }
  }

  // ── Resolve long lead-time BOMs ──
  const allBoms = resolveBoms(quote.buildType, cfg as Record<string, unknown>)
  const longLeadBoms = allBoms.filter(b => TRAILER_LONG_LEAD_CATEGORIES.has(b.category))

  const tarpInfo = (c('tarpSystem') || c('trailerTarp')).toLowerCase()
  const isPVC = tarpInfo.includes('pvc') || !tarpInfo.includes('mesh')

  const longLeadItems: LongLeadItem[] = longLeadBoms.map(b => ({
    partNumber: b.code,
    description: buildDisplayName(b.category, b.name, bodyLength, isPVC),
    quantity: 1,
  }))

  // ── Populate draft parts order ──
  if (longLeadItems.length > 0) {
    const existingOrder = await prisma.partsOrder.findFirst({ where: { jobId, status: 'draft' } })
    if (existingOrder) {
      await prisma.partsOrderItem.createMany({
        data: longLeadItems.map(item => ({
          orderId: existingOrder.id,
          partNumber: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          status: 'ordered',
        })),
      })
    }
  }

  // ── Build job note ──
  const bodyOk = bodyFolderUrl !== null
  const chassisOk = chassisFolderUrl !== null
  const lines: string[] = []

  // Body section
  if (bodyOk) {
    lines.push(`Trailer body: ${material}, ${axles}-axle`)
    if (dxfFolderUrl) lines.push(`DXF files (laser cutting): ${dxfFolderUrl}`)
    if (pdfFolderUrl) lines.push(`PDF drawings: ${pdfFolderUrl}`)
    if (!dxfFolderUrl && !pdfFolderUrl) lines.push(`Body folder: ${bodyFolderUrl}`)
  } else {
    lines.push(`⚠️ Body: ${noBodyReason}`)
    lines.push('Custom engineering required — body drawings must be created manually.')
  }

  // Chassis section
  lines.push('')
  if (chassisOk) {
    lines.push(`Chassis: ${chassisFolderUrl}`)
  } else if (modelType === 'dolly') {
    lines.push('Convertor dolly — no standard chassis folder.')
  } else {
    lines.push(`⚠️ Chassis: ${noChassisReason}`)
  }

  // Long lead-time parts
  if (longLeadItems.length > 0) {
    lines.push('')
    lines.push('Long lead-time items added to parts order:')
    longLeadItems.forEach(item => lines.push(`  • ${item.description} (${item.partNumber})`))
  }

  lines.push('')
  lines.push('Review above and advance to Ready to Start when satisfied.')

  await prisma.jobNote.create({
    data: {
      jobId,
      authorId: 'system',
      authorName: 'Kick-off Agent',
      type: 'kickoff',
      message: lines.join('\n'),
    },
  })

  // ── Add to Cold Form — Trailer Chassis tab ──
  if (chassisFolderUrl && modelType !== 'dolly') {
    try {
      const last = await prisma.coldformChassis.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
      await prisma.coldformChassis.create({
        data: {
          jobNo: job.num,
          chassisLength: `${axles}-Axle ${modelType.charAt(0).toUpperCase() + modelType.slice(1)} (${bodyLength}mm body)`,
          notes: `Chassis folder: ${chassisFolderUrl}`,
          position: (last?.position ?? 0) + 1,
        },
      })
    } catch { /* non-fatal */ }
  }

  // ── Find engineering team (Chris, Nathan, Jackson) ──
  const engineers = await prisma.user.findMany({
    where: { name: { in: ['CHRIS', 'Nathan', 'Jackson'], mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  // ── Create task (unassigned — any engineer can complete it) ──
  await prisma.jobTask.create({
    data: {
      jobId,
      title: (bodyOk && (chassisOk || modelType === 'dolly'))
        ? `Review trailer engineering pack & parts order — advance to Ready to Start`
        : `Custom engineering required — create drawings, then advance to Ready to Start`,
      assignedTo: '',
      sortOrder: 0,
    },
  })

  // ── Notify all engineers ──
  const notifMessage = (bodyOk && (chassisOk || modelType === 'dolly'))
    ? `${job.num} trailer kick-off ready — ${trailerModel}, ${longLeadItems.length} long lead-time item${longLeadItems.length !== 1 ? 's' : ''} flagged. Review and advance.`
    : `${job.num} trailer needs engineering — ${noBodyReason ?? noChassisReason}`

  if (engineers.length) {
    await prisma.notification.createMany({
      data: engineers.map((u: any) => ({
        userId: u.id,
        jobId,
        jobNum: job.num,
        type: 'kickoff',
        message: notifMessage,
      })),
    })
  }

  // ── Generate Cold Form work order ──
  if (trailerDxfFolderId) {
    const trailerKitLabel = `${axles}-Axle ${isAlly ? 'Aluminium' : 'Steel'} Trailer (${bodyLength}mm)`
    try {
      await generateWorkOrder(jobId, job.num, job.customer, trailerKitLabel, trailerDxfFolderId, trailerPdfFolderId, trailerDrawingsFolderId)
    } catch (e) {
      console.error('Trailer work order generation failed:', e)
    }
  }

  // ── Generate job drawings ──
  if (trailerDrawingsFolderId || trailerBodyLookupId) {
    try {
      await generateJobDrawings(jobId, trailerBodyLookupId, trailerDrawingsFolderId, trailerPdfFolderId, job.num)
    } catch (e) {
      console.error('Trailer job drawings generation failed:', e)
    }
  }

  // ── Generate draft VASS booking ──
  try {
    await generateDraftVass(jobId, job.num, job.customer, quoteId, cfg)
  } catch (e) {
    console.error('VASS booking generation failed:', e)
  }
}

