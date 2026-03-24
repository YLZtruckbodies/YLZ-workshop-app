import { NextRequest, NextResponse } from 'next/server'
import { resolveBoms } from '@/lib/bom-resolver'

/**
 * POST /api/bom-resolve
 * Lightweight endpoint — takes buildType + configuration, returns resolved BOMs.
 * No database calls. Used by the Xero import tool and BOM preview panel.
 */
export async function POST(req: NextRequest) {
  try {
    const { buildType, configuration } = await req.json()

    if (!buildType || !configuration) {
      return NextResponse.json({ error: 'buildType and configuration required' }, { status: 400 })
    }

    const bomList = resolveBoms(buildType, configuration as Record<string, unknown>)

    return NextResponse.json({
      bomList,
      count: bomList.length,
      tdbCount: bomList.filter(b => b.code === 'TBD').length,
    })
  } catch (err) {
    console.error('[BOM Resolve API] Error:', err)
    return NextResponse.json({ error: 'Failed to resolve BOMs' }, { status: 500 })
  }
}
