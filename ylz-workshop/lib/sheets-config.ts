// Google Sheets worker block configuration
// Maps each worker in the spreadsheet to their column range and row range

export interface SheetWorkerBlock {
  workerId: string       // Database Worker.id
  sheetHeader: string    // Header text in the sheet (e.g., "DARWIN - ALUMINIUM")
  band: 'top' | 'bottom' // Which horizontal band they're in
  headerRow: number      // Row number of the worker header (1-indexed)
  dataStartRow: number   // First row of job data
  dataEndRow: number     // Last possible row of job data
  colJobNo: string       // Column letter for JOB No.
  colType: string        // Column letter for JOB TYPE
  colStart: string       // Column letter for START
  colComp: string        // Column letter for COMP
  colDays: string        // Column letter for DAYS
}

// Sheet tab names
export const SHEET_TAB_SCHEDULE = 'Workshop schedule'
export const SHEET_TAB_COMPLETED = 'Completed orders'

// Worker blocks — derived from the actual sheet layout
// Top band: rows 2-15, Bottom band: rows 17-35
// Workers separated by "OR" columns (1 column gap = the "OR" separator)
export const SHEET_WORKER_BLOCKS: SheetWorkerBlock[] = [
  // ── TOP BAND (rows 2-15) ──
  {
    workerId: 'darwin',
    sheetHeader: 'DARWIN - ALUMINIUM',
    band: 'top',
    headerRow: 2,
    dataStartRow: 4,
    dataEndRow: 15,
    colJobNo: 'A',
    colType: 'B',
    colStart: 'C',
    colComp: 'D',
    colDays: 'E',
  },
  {
    workerId: 'julio',
    sheetHeader: 'JULIO - ALUMINIUM',
    band: 'top',
    headerRow: 2,
    dataStartRow: 4,
    dataEndRow: 15,
    colJobNo: 'G',
    colType: 'H',
    colStart: 'I',
    colComp: 'J',
    colDays: 'K',
  },
  {
    workerId: 'ben_alloy',
    sheetHeader: 'BEN - ALUMINIUM',
    band: 'top',
    headerRow: 2,
    dataStartRow: 4,
    dataEndRow: 15,
    colJobNo: 'M',
    colType: 'N',
    colStart: 'O',
    colComp: 'P',
    colDays: 'Q',
  },
  {
    workerId: 'ben_alloy', // Ben QC/Fitout — same worker, second block for fitout jobs
    sheetHeader: 'BEN - QC (FITOUT)',
    band: 'top',
    headerRow: 2,
    dataStartRow: 4,
    dataEndRow: 15,
    colJobNo: 'S',
    colType: 'T',
    colStart: 'U',
    colComp: 'V',
    colDays: 'W',
  },
  // ── BOTTOM BAND (rows 17-35) ──
  {
    workerId: 'rav',
    sheetHeader: 'RAV - STEEL/HARDOX BODY',
    band: 'bottom',
    headerRow: 17,
    dataStartRow: 19,
    dataEndRow: 35,
    colJobNo: 'A',
    colType: 'B',
    colStart: 'C',
    colComp: 'D',
    colDays: 'E',
  },
  {
    workerId: 'jd',
    sheetHeader: 'JD - RAV/HARDOX BODY',
    band: 'bottom',
    headerRow: 17,
    dataStartRow: 19,
    dataEndRow: 35,
    colJobNo: 'G',
    colType: 'H',
    colStart: 'I',
    colComp: 'J',
    colDays: 'K',
  },
  {
    workerId: 'kabaj',
    sheetHeader: 'KABAJ - CHASSIS',
    band: 'bottom',
    headerRow: 17,
    dataStartRow: 19,
    dataEndRow: 35,
    colJobNo: 'M',
    colType: 'N',
    colStart: 'O',
    colComp: 'P',
    colDays: 'Q',
  },
  {
    workerId: 'mohit',
    sheetHeader: 'MOHIT - CHASSIS',
    band: 'bottom',
    headerRow: 17,
    dataStartRow: 19,
    dataEndRow: 35,
    colJobNo: 'S',
    colType: 'T',
    colStart: 'U',
    colComp: 'V',
    colDays: 'W',
  },
]

// Helper: convert column letter to 1-based column number
export function colLetterToNumber(col: string): number {
  let num = 0
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64)
  }
  return num
}

// Helper: convert 1-based column number to letter
export function colNumberToLetter(num: number): string {
  let letter = ''
  while (num > 0) {
    const remainder = (num - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    num = Math.floor((num - 1) / 26)
  }
  return letter
}

// Find which worker block(s) a given row/col falls into
export function findBlockByCell(row: number, col: number): SheetWorkerBlock | undefined {
  return SHEET_WORKER_BLOCKS.find((block) => {
    const colStart = colLetterToNumber(block.colJobNo)
    const colEnd = colLetterToNumber(block.colDays)
    return (
      row >= block.dataStartRow &&
      row <= block.dataEndRow &&
      col >= colStart &&
      col <= colEnd
    )
  })
}

// Find all blocks for a given worker ID (a worker may have multiple blocks, e.g. Ben)
export function findBlocksForWorker(workerId: string): SheetWorkerBlock[] {
  return SHEET_WORKER_BLOCKS.filter((b) => b.workerId === workerId)
}

// Find a single block for a worker (first match)
export function findBlockForWorker(workerId: string): SheetWorkerBlock | undefined {
  return SHEET_WORKER_BLOCKS.find((b) => b.workerId === workerId)
}
