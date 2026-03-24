import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveBoms } from '@/lib/bom-resolver'

/**
 * GET /api/quotes/:id/boms
 * Returns the resolved BOM list for a quote, without needing to accept it first.
 * Used by the Engineering / MRP Tools page to preview BOMs for any quote.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        quoteNumber: true,
        buildType: true,
        configuration: true,
        customerName: true,
        status: true,
        jobId: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const config = (quote.configuration && typeof quote.configuration === 'object')
      ? quote.configuration as Record<string, unknown>
      : {}

    const bomList = resolveBoms(quote.buildType, config)

    // If the quote has a linked job, also return the job's stored BOM list
    let jobBomList = null
    if (quote.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: quote.jobId },
        select: { num: true, bomList: true },
      })
      if (job) {
        jobBomList = { jobNum: job.num, bomList: job.bomList }
      }
    }

    return NextResponse.json({
      quoteNumber: quote.quoteNumber,
      buildType: quote.buildType,
      customer: quote.customerName,
      status: quote.status,
      resolvedBoms: bomList,
      resolvedCount: bomList.length,
      tdbCount: bomList.filter(b => b.code === 'TBD').length,
      job: jobBomList,
    })
  } catch (err) {
    console.error('[BOM API] Error:', err)
    return NextResponse.json({ error: 'Failed to resolve BOMs' }, { status: 500 })
  }
}
