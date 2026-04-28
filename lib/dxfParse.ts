// dxf-parser entity shapes (from actual library source, not assumed):
//
//   LINE      → { type, vertices: [{x,y}, {x,y}] }   (NOT startPoint/endPoint)
//   ARC       → { type, center, radius, startAngle (RAD), endAngle (RAD) }
//   CIRCLE    → { type, center, radius }
//   LWPOLYLINE→ { type, vertices: [{x,y,bulge?}], shape: boolean (closed) }
//   POLYLINE  → { type, vertices: [{x,y}], shape: boolean }
//   SPLINE    → { type, controlPoints?, fitPoints? }
//   INSERT    → { type, name, position, xScale?, yScale?, rotation? (DEG) }
//
// ARC/CIRCLE start/endAngle are stored in RADIANS by dxf-parser (it multiplies by π/180).
// INSERT rotation stays in DEGREES.

interface DxfPt { x: number; y: number; z?: number }

interface DxfEntity {
  type: string
  // LINE, LWPOLYLINE, POLYLINE — shared vertices array
  vertices?: Array<DxfPt & { bulge?: number }>
  shape?: boolean       // true = closed polyline
  // ARC / CIRCLE
  center?: DxfPt
  radius?: number
  startAngle?: number   // radians (dxf-parser pre-converts)
  endAngle?: number     // radians
  // SPLINE
  controlPoints?: DxfPt[]
  fitPoints?: DxfPt[]
  // INSERT (block reference)
  name?: string
  position?: DxfPt
  xScale?: number
  yScale?: number
  rotation?: number     // degrees (NOT converted by dxf-parser for INSERT)
}

interface DxfBlock {
  entities?: DxfEntity[]
  position?: DxfPt      // block base point
}

interface DxfDocument {
  entities: DxfEntity[]
  blocks?: Record<string, DxfBlock>
}

export interface DxfGeometry {
  bboxLength: number | null   // larger dimension, mm
  bboxWidth:  number | null   // smaller dimension, mm
  perimeterMm: number
}

// ── 2D affine transform ───────────────────────────────────────────────────────
// Stored as 2×3 matrix: p_world = [a·px + b·py + tx,  c·px + d·py + ty]
type Mat = [number, number, number, number, number, number]
//          a        b        c        d        tx       ty

const IDENT: Mat = [1, 0, 0, 1, 0, 0]

function applyMat(p: DxfPt, m: Mat): DxfPt {
  return { x: m[0] * p.x + m[1] * p.y + m[4], y: m[2] * p.x + m[3] * p.y + m[5] }
}

// T_result(p) = T_outer(T_inner(p))
function composeMat(outer: Mat, inner: Mat): Mat {
  return [
    outer[0] * inner[0] + outer[1] * inner[2],
    outer[0] * inner[1] + outer[1] * inner[3],
    outer[2] * inner[0] + outer[3] * inner[2],
    outer[2] * inner[1] + outer[3] * inner[3],
    outer[0] * inner[4] + outer[1] * inner[5] + outer[4],
    outer[2] * inner[4] + outer[3] * inner[5] + outer[5],
  ]
}

// Build the affine matrix for an INSERT entity.
// T(p) = R · S · (p − basePoint) + insertPosition
function insertMat(e: DxfEntity, base: DxfPt): Mat {
  const pos = e.position ?? { x: 0, y: 0 }
  const sx  = e.xScale  ?? 1
  const sy  = e.yScale  ?? 1
  const rot = (e.rotation ?? 0) * (Math.PI / 180)  // INSERT rotation is in degrees
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const a = sx * cos, b = -sy * sin
  const c = sx * sin, d =  sy * cos
  return [
    a, b, c, d,
    pos.x - (a * base.x + b * base.y),
    pos.y - (c * base.x + d * base.y),
  ]
}

// For ARC/CIRCLE perimeter: scale = sqrt(|det|).
// Exact for uniform scale; approximate for non-uniform (rare in laser DXF).
function matScale(m: Mat): number { return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) }

// ── geometry helpers ──────────────────────────────────────────────────────────

function dist(a: DxfPt, b: DxfPt): number {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

function linePerim(e: DxfEntity, m: Mat): number {
  const v = e.vertices
  if (!v || v.length < 2) return 0
  return dist(applyMat(v[0], m), applyMat(v[1], m))
}

function arcPerim(e: DxfEntity, m: Mat): number {
  if (e.radius == null || e.startAngle == null || e.endAngle == null) return 0
  // startAngle / endAngle are already in RADIANS
  const span = ((e.endAngle - e.startAngle) + 2 * Math.PI) % (2 * Math.PI) || 2 * Math.PI
  return e.radius * span * matScale(m)
}

function circlePerim(e: DxfEntity, m: Mat): number {
  return 2 * Math.PI * (e.radius ?? 0) * matScale(m)
}

function polyPerim(e: DxfEntity, m: Mat): number {
  const pts = e.vertices ?? []
  if (pts.length < 2) return 0
  const n = pts.length
  const end = e.shape ? n : n - 1
  let len = 0
  for (let i = 0; i < end; i++) {
    len += dist(applyMat(pts[i], m), applyMat(pts[(i + 1) % n], m))
  }
  return len
}

function splinePerim(e: DxfEntity, m: Mat): number {
  const pts = e.controlPoints ?? e.fitPoints ?? []
  if (pts.length < 2) return 0
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += dist(applyMat(pts[i - 1], m), applyMat(pts[i], m))
  }
  return len
}

function entityBboxPts(e: DxfEntity): DxfPt[] {
  switch (e.type) {
    case 'LINE':
      return (e.vertices?.length ?? 0) >= 2 ? [e.vertices![0], e.vertices![1]] : []

    case 'CIRCLE': {
      if (!e.center || e.radius == null) return []
      const { x, y } = e.center, r = e.radius
      return [{ x: x - r, y: y - r }, { x: x + r, y: y + r }]
    }

    case 'ARC': {
      if (!e.center || e.radius == null) return []
      const { x, y } = e.center, r = e.radius
      const pts: DxfPt[] = []
      // startAngle / endAngle already in radians
      if (e.startAngle != null) pts.push({ x: x + r * Math.cos(e.startAngle), y: y + r * Math.sin(e.startAngle) })
      if (e.endAngle   != null) pts.push({ x: x + r * Math.cos(e.endAngle),   y: y + r * Math.sin(e.endAngle) })
      return pts
    }

    case 'LWPOLYLINE':
    case 'POLYLINE':
      return (e.vertices ?? []).map(v => ({ x: v.x, y: v.y }))

    case 'SPLINE':
      return (e.controlPoints ?? e.fitPoints ?? []).map(p => ({ x: p.x, y: p.y }))

    default:
      return []
  }
}

// ── recursive entity walker ───────────────────────────────────────────────────

interface Accum {
  perimeter: number
  minX: number; minY: number
  maxX: number; maxY: number
}

function walkEntities(
  entities: DxfEntity[],
  m: Mat,
  blocks: Record<string, DxfBlock>,
  acc: Accum,
  depth: number,
): void {
  if (depth > 12) return

  for (const e of entities) {
    if (e.type === 'INSERT') {
      const block = e.name ? blocks[e.name] : undefined
      if (!block?.entities?.length) continue
      const base = block.position ?? { x: 0, y: 0 }
      walkEntities(block.entities, composeMat(m, insertMat(e, base)), blocks, acc, depth + 1)
      continue
    }

    // perimeter
    try {
      switch (e.type) {
        case 'LINE':       acc.perimeter += linePerim(e, m);   break
        case 'ARC':        acc.perimeter += arcPerim(e, m);    break
        case 'CIRCLE':     acc.perimeter += circlePerim(e, m); break
        case 'LWPOLYLINE': acc.perimeter += polyPerim(e, m);   break
        case 'POLYLINE':   acc.perimeter += polyPerim(e, m);   break
        case 'SPLINE':     acc.perimeter += splinePerim(e, m); break
      }
    } catch { /* skip bad entity */ }

    // bbox — transform points to world space
    for (const local of entityBboxPts(e)) {
      const w = applyMat(local, m)
      if (!isFinite(w.x) || !isFinite(w.y)) continue
      if (w.x < acc.minX) acc.minX = w.x
      if (w.x > acc.maxX) acc.maxX = w.x
      if (w.y < acc.minY) acc.minY = w.y
      if (w.y > acc.maxY) acc.maxY = w.y
    }
  }
}

// ── main export ───────────────────────────────────────────────────────────────

export function parseDxf(dxfContent: string): DxfGeometry {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('dxf-parser')
  // dxf-parser exports the constructor directly (CJS). Webpack may wrap it under .default.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DxfParser = (mod.default ?? mod) as { new(): { parseSync(s: string): DxfDocument } }
  const parser = new DxfParser()

  let doc: DxfDocument
  try {
    doc = parser.parseSync(dxfContent)
  } catch {
    return { bboxLength: null, bboxWidth: null, perimeterMm: 0 }
  }

  const blocks = doc?.blocks ?? {}
  const acc: Accum = { perimeter: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  walkEntities(doc?.entities ?? [], IDENT, blocks, acc, 0)

  const perimeterMm = Math.round(acc.perimeter * 100) / 100

  if (!isFinite(acc.minX)) {
    return { bboxLength: null, bboxWidth: null, perimeterMm }
  }

  const sx = acc.maxX - acc.minX
  const sy = acc.maxY - acc.minY
  return {
    bboxLength:  Math.round(Math.max(sx, sy) * 100) / 100,
    bboxWidth:   Math.round(Math.min(sx, sy) * 100) / 100,
    perimeterMm,
  }
}
