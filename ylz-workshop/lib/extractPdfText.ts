/**
 * PDF text extractor using pdf-parse v1 — pure JS, no native dependencies.
 * Works reliably in Vercel serverless (no canvas, no DOMMatrix required).
 *
 * Replaces pdfjs-dist which requires the canvas native module to initialise
 * its polyfills. On Vercel Lambda, canvas is unavailable, so pdfjs silently
 * returns empty text — causing all MO fields to parse as Unknown/empty.
 */

// Use the internal lib directly — pdf-parse/index.js reads a test PDF at load
// time which crashes Next.js static page collection during build on Vercel.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (dataBuffer: Buffer) => Promise<{ text: string; numpages: number }>

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer)
  return result.text
}
