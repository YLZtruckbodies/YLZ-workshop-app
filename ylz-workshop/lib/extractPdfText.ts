/**
 * Lightweight PDF text extractor using pdfjs-dist v3 (Node 18 compatible).
 * v3 does NOT need process.getBuiltinModule (which is Node 22+).
 * Uses the legacy build which works in any Node.js environment.
 */

// Tell pdfjs-dist there is no worker — text extraction runs in the main thread.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as typeof import('pdfjs-dist')
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const doc = await pdfjsLib.getDocument({
    data:         new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page    = await doc.getPage(i)
    const content = await page.getTextContent()
    // Reconstruct lines: pdfjs gives individual text items with (x,y) positions.
    // Sort by y (top→bottom) then x (left→right), join with spaces/newlines.
    type Item = { str: string; transform: number[] }
    const items = (content.items as Item[]).filter(it => it.str)
    items.sort((a, b) => {
      const dy = Math.round(b.transform[5]) - Math.round(a.transform[5])
      return dy !== 0 ? dy : a.transform[4] - b.transform[4]
    })

    // Group items that are on the same y-position into lines
    const lines: string[] = []
    let lastY: number | null = null
    let line = ''
    for (const item of items) {
      const y = Math.round(item.transform[5])
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim())
        line = ''
      }
      line += (line ? ' ' : '') + item.str
      lastY = y
    }
    if (line) lines.push(line.trim())
    pages.push(lines.join('\n'))
  }

  return pages.join('\n')
}
