/**
 * DOM API polyfills for Node.js 18 — required by pdfjs-dist (used inside pdf-parse v2).
 * Import this BEFORE any pdf-parse / pdfjs-dist import so the globals are available
 * when those modules initialise.
 */

if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    is2D = true; isIdentity = true

    constructor(init?: number[] | string) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = this.m11 = init[0]; this.b = this.m12 = init[1]
        this.c = this.m21 = init[2]; this.d = this.m22 = init[3]
        this.e = this.m41 = init[4]; this.f = this.m42 = init[5]
      }
    }

    multiply(o: DOMMatrixPolyfill): DOMMatrixPolyfill {
      const r = new DOMMatrixPolyfill()
      r.a  = r.m11 = this.a * o.a  + this.c * o.b
      r.b  = r.m12 = this.b * o.a  + this.d * o.b
      r.c  = r.m21 = this.a * o.c  + this.c * o.d
      r.d  = r.m22 = this.b * o.c  + this.d * o.d
      r.e  = r.m41 = this.a * o.e  + this.c * o.f  + this.e
      r.f  = r.m42 = this.b * o.e  + this.d * o.f  + this.f
      return r
    }

    inverse(): DOMMatrixPolyfill {
      const det = this.a * this.d - this.b * this.c
      const r = new DOMMatrixPolyfill()
      if (det === 0) return r
      r.a  = r.m11 =  this.d / det
      r.b  = r.m12 = -this.b / det
      r.c  = r.m21 = -this.c / det
      r.d  = r.m22 =  this.a / det
      r.e  = r.m41 = (this.c * this.f - this.d * this.e) / det
      r.f  = r.m42 = (this.b * this.e - this.a * this.f) / det
      return r
    }

    invertSelf(): this { Object.assign(this, this.inverse()); return this }

    translate(tx = 0, ty = 0): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([
        this.a, this.b, this.c, this.d,
        this.a * tx + this.c * ty + this.e,
        this.b * tx + this.d * ty + this.f,
      ])
    }

    translateSelf(tx = 0, ty = 0): this {
      this.e = this.m41 = this.a * tx + this.c * ty + this.e
      this.f = this.m42 = this.b * tx + this.d * ty + this.f
      return this
    }

    scale(sx = 1, sy = sx): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([
        this.a * sx, this.b * sx, this.c * sy, this.d * sy, this.e, this.f,
      ])
    }

    scaleSelf(sx = 1, sy = sx): this {
      this.a = this.m11 *= sx; this.b = this.m12 *= sx
      this.c = this.m21 *= sy; this.d = this.m22 *= sy
      return this
    }

    rotate(deg = 0): DOMMatrixPolyfill {
      const rad = (deg * Math.PI) / 180
      const cos = Math.cos(rad), sin = Math.sin(rad)
      return this.multiply(new DOMMatrixPolyfill([cos, sin, -sin, cos, 0, 0]))
    }

    rotateSelf(deg = 0): this { Object.assign(this, this.rotate(deg)); return this }

    transformPoint(p: { x?: number; y?: number } = {}): { x: number; y: number; z: number; w: number } {
      const x = p.x ?? 0, y = p.y ?? 0
      return { x: this.a * x + this.c * y + this.e, y: this.b * x + this.d * y + this.f, z: 0, w: 1 }
    }

    toString(): string {
      return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`
    }

    static fromMatrix(m: Partial<DOMMatrixPolyfill>): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([m.a ?? 1, m.b ?? 0, m.c ?? 0, m.d ?? 1, m.e ?? 0, m.f ?? 0])
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill
}

if (typeof globalThis.DOMPoint === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).DOMPoint = class DOMPoint {
    constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}
    static fromPoint(p: { x?: number; y?: number; z?: number; w?: number } = {}) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (globalThis as any).DOMPoint(p.x ?? 0, p.y ?? 0, p.z ?? 0, p.w ?? 1)
    }
  }
}
