import { NextRequest, NextResponse } from 'next/server'
import { runKickoffAgent, runTrailerKickoffAgent } from '@/lib/kickoff-agent'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { jobId, quoteId } = await req.json()
  if (!jobId || !quoteId) return NextResponse.json({ error: 'jobId and quoteId required' }, { status: 400 })

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { buildType: true } })
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const bt = (quote.buildType || '').toLowerCase()
  if (bt === 'trailer') {
    await runTrailerKickoffAgent(jobId, quoteId)
  } else {
    await runKickoffAgent(jobId, quoteId)
  }

  return NextResponse.json({ ok: true })
}
