import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ jobs: [], quotes: [] })

  const [jobs, quotes] = await Promise.all([
    prisma.job.findMany({
      where: {
        OR: [
          { num: { contains: q, mode: 'insensitive' } },
          { customer: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
          { dealer: { contains: q, mode: 'insensitive' } },
          { make: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quote.findMany({
      where: {
        OR: [
          { quoteNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { buildType: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ jobs, quotes })
}
