import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveBoms, BomEntry } from '@/lib/bom-resolver'

/**
 * GET /api/jobs/:id/boms
 * Returns the BOM list for a job. If the job has a stored bomList, returns it.
 * If not (legacy jobs), tries to resolve from the linked quote's configuration.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Try to find by job ID or job number
    let job = await prisma.job.findUnique({ where: { id: params.id } })
    if (!job) {
      job = await prisma.job.findUnique({ where: { num: params.id } })
    }
    if (!job) {
      // Try case-insensitive job number match
      const jobs = await prisma.job.findMany({
        where: { num: { contains: params.id, mode: 'insensitive' } },
        take: 1,
      })
      job = jobs[0] || null
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if job already has a BOM list
    const storedBoms = Array.isArray(job.bomList) ? job.bomList as unknown as BomEntry[] : []

    // If no stored BOMs, try to resolve from the linked quote
    let resolvedFromQuote = false
    let bomList = storedBoms

    if (bomList.length === 0) {
      const quote = await prisma.quote.findFirst({
        where: { jobId: job.id },
        select: { buildType: true, configuration: true, quoteNumber: true },
      })

      if (quote) {
        const config = (quote.configuration && typeof quote.configuration === 'object')
          ? quote.configuration as Record<string, unknown>
          : {}
        bomList = resolveBoms(quote.buildType, config)
        resolvedFromQuote = true

        // Store it back on the job for next time
        if (bomList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.job.update({ where: { id: job.id }, data: { bomList: bomList as any } })
        }
      }
    }

    return NextResponse.json({
      jobNum: job.num,
      jobType: job.type,
      customer: job.customer,
      bomList,
      bomCount: bomList.length,
      tdbCount: bomList.filter(b => b.code === 'TBD').length,
      resolvedFromQuote,
      source: bomList.length > 0
        ? (resolvedFromQuote ? 'Resolved from linked quote (now saved)' : 'Stored on job')
        : 'No BOMs available — no linked quote found',
    })
  } catch (err) {
    console.error('[Job BOM API] Error:', err)
    return NextResponse.json({ error: 'Failed to get BOMs' }, { status: 500 })
  }
}
