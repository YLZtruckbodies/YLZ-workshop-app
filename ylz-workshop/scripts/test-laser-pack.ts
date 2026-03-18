/**
 * Local stress-test for the laser-pack pipeline.
 * Run:  npx ts-node --project tsconfig.json scripts/test-laser-pack.ts
 */

// Polyfills FIRST — same order as route.ts
require('../lib/node-polyfills')

import path from 'path'
import fs   from 'fs'
import { parseMO, extractThickness } from '../lib/parseMO'
import type { MOData } from '../lib/parseMO'

// ── helpers ───────────────────────────────────────────────────────────────────
let passed = 0; let failed = 0

function ok(label: string) { console.log(`  ✅  ${label}`); passed++ }
function fail(label: string, err: unknown) {
  const msg = err instanceof Error
    ? `${err.message}\n       ${err.stack?.split('\n').slice(1,3).join('\n       ')}`
    : String(err)
  console.error(`  ❌  ${label}\n       ${msg}`)
  failed++
}
async function run(label: string, fn: () => Promise<void> | void) {
  process.stdout.write(`\n▶  ${label}\n`)
  try { await fn() }
  catch (err) { fail(label, err) }
}

// ── synthetic MO text ─────────────────────────────────────────────────────────
const SAMPLE_MO = `
Manufacturing Order
Number: MO-12345
Product: YLZ 5300 Alloy Tipper Body
Quantity: 2
Date: 18/03/2026

Parts:
100-01-001 REAR TAILGATE PLATE
Stock: 810-01-005
1 EACH
810-01-005 5MM HARDOX 450 PLATE

100-01-002 FRONT HEADBOARD PLATE
Stock: 810-01-006
2 EACH
810-01-006 6MM HARDOX 450 PLATE

100-01-003 SIDE CHEQUER PLATE
Stock: 820-02-001
4 EACH
820-02-001 3MM 5005 ALLOY CHEQUER PLATE

100-01-004 FLOOR PLATE
Stock: 820-02-002
1 EACH
820-02-002 4MM 5052 ALLOY PLATE

Operations:
100-01-001
LASERCUT
100-01-002
LASER CUT
100-01-003
LASERCUT
100-01-004
WELD
`

const MINIMAL_JPEG = Buffer.from(
  'ffd8ffe000104a464946000101000001000100' +
  '00ffdb004300' + '10'.repeat(64) +
  'ffc0000b080001000101011100' +
  'ffc4001f000001050101010101010000000000000000000102030405060708090a0b' +
  'ffda00080101000003f00aa28ffd9',
  'hex'
)

;(async () => {

  // ── 1. parseMO ──────────────────────────────────────────────────────────────
  await run('parseMO — normal MO', () => {
    const mo = parseMO(SAMPLE_MO)
    console.log(`     parts=${mo.parts.length}  laserParts=${mo.laserParts.length}`)
    mo.parts.forEach(p =>
      console.log(`     ${p.partNumber}  mat="${p.material}"  thick=${p.thickness}  laser=${p.isLaserCut}`)
    )
    if (mo.moNumber !== 'MO-12345') throw new Error(`moNumber=${mo.moNumber}`)
    if (mo.parts.length < 1)        throw new Error('no parts')
    if (mo.laserParts.length < 1)   throw new Error('no laser parts')
    ok(`moNumber=${mo.moNumber}  parts=${mo.parts.length}  laserParts=${mo.laserParts.length}`)
  })

  await run('parseMO — no laser ops → laserParts empty', () => {
    const mo = parseMO(`Manufacturing Order\nNumber: MO-99999\nProduct: Svc\nQuantity: 1\nDate: 01/01/2026\nParts:\n200-01-001 PLATE\nStock: 810-01-001\n1 EACH\n810-01-001 12MM HARDOX\nOperations:\n200-01-001\nWELD\n`)
    if (mo.laserParts.length !== 0) throw new Error(`expected 0 laserParts, got ${mo.laserParts.length}`)
    ok('laserParts=0')
  })

  await run('parseMO — unrecognised PDF → Unknown', () => {
    const mo = parseMO('Random text, not an MO')
    if (mo.moNumber !== 'Unknown') throw new Error(`expected Unknown, got ${mo.moNumber}`)
    ok('Unknown returned correctly')
  })

  await run('extractThickness — various formats', () => {
    const cases: [string, string][] = [
      ['5MM HARDOX 450',    '5mm'],
      ['12mm plate',        '12mm'],
      ['4.5MM alloy',       '4.5mm'],
      ['no thickness here', 'Unknown'],
    ]
    for (const [input, expected] of cases) {
      const got = extractThickness(input)
      if (got !== expected) throw new Error(`'${input}' → '${got}' (want '${expected}')`)
    }
    ok('all 4 cases correct')
  })

  // ── 2. generateLaserSheet ───────────────────────────────────────────────────
  // Import after polyfills are loaded
  const { generateLaserSheet } = require('../lib/generateSheet') as typeof import('../lib/generateSheet')

  const OUT = path.join(__dirname, '..', '.test-output')
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

  const mockMO = parseMO(SAMPLE_MO)

  await run('generateLaserSheet — no drawings (placeholders only)', async () => {
    const buf = await generateLaserSheet(mockMO)
    if (!buf || buf.length < 500) throw new Error(`too small: ${buf?.length} bytes`)
    fs.writeFileSync(path.join(OUT, 'no-drawings.pdf'), buf)
    ok(`${buf.length} bytes → .test-output/no-drawings.pdf`)
  })

  await run('generateLaserSheet — with mock JPEG thumbnails', async () => {
    const drawings = new Map<string, Buffer>()
    mockMO.laserParts.forEach(p => drawings.set(p.partNumber, MINIMAL_JPEG))
    const buf = await generateLaserSheet(mockMO, drawings)
    if (!buf || buf.length < 500) throw new Error(`too small: ${buf?.length} bytes`)
    fs.writeFileSync(path.join(OUT, 'with-drawings.pdf'), buf)
    ok(`${buf.length} bytes → .test-output/with-drawings.pdf`)
  })

  await run('generateLaserSheet — 20 parts (multi-page)', async () => {
    const bigMO: MOData = {
      moNumber: 'MO-BIG',
      product:  'Big Build',
      quantity: '1',
      date:     '18/03/2026',
      parts: Array.from({ length: 20 }, (_, i) => ({
        partNumber:  `1${String(i).padStart(2,'0')}-01-${String(i+1).padStart(3,'0')}`,
        description: `Part ${i + 1}`,
        quantity:    `${i + 1} EACH`,
        material:    i % 2 === 0 ? '5MM HARDOX 450 PLATE' : '3MM 5005 ALLOY PLATE',
        thickness:   i % 2 === 0 ? '5mm' : '3mm',
        isLaserCut:  true,
      })),
      laserParts: [],
    }
    bigMO.laserParts = bigMO.parts
    const buf = await generateLaserSheet(bigMO)
    if (!buf || buf.length < 500) throw new Error(`too small: ${buf?.length} bytes`)
    fs.writeFileSync(path.join(OUT, 'multi-page.pdf'), buf)
    ok(`${buf.length} bytes → .test-output/multi-page.pdf`)
  })

  await run('generateLaserSheet — empty parts list', async () => {
    const emptyMO: MOData = { ...mockMO, parts: [], laserParts: [] }
    const buf = await generateLaserSheet(emptyMO)
    if (!buf || buf.length < 100) throw new Error(`too small: ${buf?.length} bytes`)
    ok(`${buf.length} bytes`)
  })

  await run('generateLaserSheet — long names (truncation check)', async () => {
    const longMO: MOData = {
      moNumber: 'MO-LONG',
      product:  'This Product Name Is Very Long And Should Be Truncated By The Header Layout',
      quantity: '99',
      date:     '18/03/2026',
      parts: [{
        partNumber:  '100-99-999',
        description: 'Extremely long description exceeding twenty-two characters',
        quantity:    '99 EACH',
        material:    '12MM HARDOX 500 WEAR PLATE EXTRA THICK GRADE A',
        thickness:   '12mm',
        isLaserCut:  true,
      }],
      laserParts: [],
    }
    longMO.laserParts = longMO.parts
    const buf = await generateLaserSheet(longMO)
    if (!buf || buf.length < 500) throw new Error(`too small: ${buf?.length} bytes`)
    ok(`${buf.length} bytes`)
  })

  await run('generateLaserSheet — invalid JPEG buffer (pdfkit must not crash)', async () => {
    const badJpeg = Buffer.from('this is not a jpeg')
    const drawings = new Map<string, Buffer>([['100-01-001', badJpeg]])
    // Should fall back to placeholder, not throw
    const buf = await generateLaserSheet(mockMO, drawings)
    if (!buf || buf.length < 500) throw new Error(`too small: ${buf?.length} bytes`)
    ok(`gracefully fell back to placeholder — ${buf.length} bytes`)
  })

  // ── 3. extractPdfText module load ────────────────────────────────────────────
  await run('pdfjs-dist v3 — module loads without Node-version error', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const lib = require('pdfjs-dist/legacy/build/pdf.js')
    if (typeof lib.getDocument !== 'function') throw new Error(`getDocument is not a function`)
    ok('pdfjs-dist loaded OK, getDocument available')
  })

  // ── summary ──────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(52))
  console.log(`  ${passed} passed   ${failed} failed`)
  console.log('─'.repeat(52))
  if (failed > 0) process.exit(1)

})()
