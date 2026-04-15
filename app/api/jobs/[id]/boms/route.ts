import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveBoms, BomEntry } from '@/lib/bom-resolver'

function formatBomSummary(bomList: BomEntry[]): string {
  return bomList.map(b => {
    const base = `${b.code} — ${b.name}`
    return b.note ? `${base} (${b.note})` : base
  }).join('\n')
}

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

/**
 * POST /api/jobs/:id/boms
 * Force re-resolves the BOM from the linked quote config, updates job.bomList,
 * and refreshes the MrpChecklist mrp-entry item so the displayed list is current.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let job = await prisma.job.findUnique({ where: { id: params.id } })
    if (!job) job = await prisma.job.findUnique({ where: { num: params.id } })
    if (!job) {
      const jobs = await prisma.job.findMany({
        where: { num: { contains: params.id, mode: 'insensitive' } },
        take: 1,
      })
      job = jobs[0] || null
    }
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const quote = await prisma.quote.findFirst({
      where: { jobId: job.id },
      select: { buildType: true, configuration: true },
    })
    if (!quote) return NextResponse.json({ error: 'No linked quote found' }, { status: 404 })

    const config = (quote.configuration && typeof quote.configuration === 'object')
      ? quote.configuration as Record<string, unknown>
      : {}
    const bomList = resolveBoms(quote.buildType, config)

    // Update job.bomList
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.job.update({ where: { id: job.id }, data: { bomList: bomList as any } })

    // Update the mrp-entry checklist item if it exists
    const checklist = await prisma.mrpChecklist.findUnique({ where: { jobId: job.id } })
    if (checklist) {
      const item = await prisma.mrpChecklistItem.findFirst({
        where: { checklistId: checklist.id, section: 'mrp-entry' },
      })
      if (item) {
        const bomSummary = formatBomSummary(bomList)
        await prisma.mrpChecklistItem.update({
          where: { id: item.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { details: { bomCount: bomList.length, bomList: bomSummary } as any },
        })
      }
    }

    return NextResponse.json({ ok: true, bomCount: bomList.length, bomList: formatBomSummary(bomList) })
  } catch (err) {
    console.error('[Job BOM Refresh] Error:', err)
    return NextResponse.json({ error: 'Failed to refresh BOMs' }, { status: 500 })
  }
}
