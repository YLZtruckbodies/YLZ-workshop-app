/**
 * PDF text extractor for SolidWorks engineering drawing PDFs.
 *
 * Uses pdfjs-dist with position-sorted text output — items sorted top→bottom
 * then left→right by x,y transform coordinates. This matches how pdfplumber
 * (the Python equivalent used in work_order_generator.py) reconstructs reading
 * order from the PDF content stream. Without position sorting, pdf-parse returns
 * SolidWorks title block text in draw order which jumbles MATERIAL, thickness,
 * and other fields, causing every extraction to return "Unknown".
 *
 * Falls back to pdf-parse if pdfjs-dist fails for any reason.
 */

// ── pdfjs-dist setup ──────────────────────────────────────────────────────────
// Use the legacy CommonJS build. Set workerSrc to empty string so pdfjs runs
// in-process (no Worker thread), which is required in Vercel serverless.
// Text extraction does not require canvas — canvas is only needed for rendering.

interface PdfTextItem { str?: string; transform: number[] }
interface PdfPage { getTextContent: () => Promise<{ items: PdfTextItem[] }> }
interface PdfDoc { numPages: number; getPage: (n: number) => Promise<PdfPage> }
interface PdfjsLib {
  getDocument: (params: object) => { promise: Promise<PdfDoc> }
  GlobalWorkerOptions: { workerSrc: string }
}

let _pdfjs: PdfjsLib | null = null
function getPdfjs(): PdfjsLib | null {
  if (_pdfjs !== null) return _pdfjs
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const lib = require('pdfjs-dist/legacy/build/pdf.js') as PdfjsLib
    lib.GlobalWorkerOptions.workerSrc = '' // in-process mode — no Worker thread
    _pdfjs = lib
    return lib
  } catch {
    _pdfjs = null
    return null
  }
}

// ── Fallback: pdf-parse ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfParseFallback = require('pdf-parse/lib/pdf-parse.js') as (
  buf: Buffer
) => Promise<{ text: string; numpages: number }>

// ── Main export ───────────────────────────────────────────────────────────────

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const lib = getPdfjs()

  if (lib) {
    try {
      const data = new Uint8Array(buffer)
      const loadingTask = lib.getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        disableFontFace: true,
      })
      const pdf = await loadingTask.promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()

        // Sort by y descending (top of page first), then x ascending (left→right).
        // This reconstructs reading order the same way pdfplumber does, so
        // "MATERIAL  Hardox 500 - 6mm" in a SolidWorks title block comes out
        // as adjacent tokens rather than being scattered through the output.
        const items = content.items
          .filter(item => item.str?.trim())
          .sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5]
            if (Math.abs(yDiff) > 3) return yDiff       // different rows
            return a.transform[4] - b.transform[4]       // same row: L → R
          })

        fullText += items.map(item => item.str).join(' ') + '\n'
      }

      if (fullText.trim()) return fullText
      // If pdfjs returned empty text, fall through to pdf-parse
    } catch {
      // pdfjs failed — fall through
    }
  }

  // Fallback: pdf-parse (no position sorting, but works for simpler PDFs)
  const result = await pdfParseFallback(buffer)
  return result.text
}
