import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pricing?hash=xxx or ?buildType=xxx
// Returns historical pricing for matching configurations
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hash = searchParams.get('hash')
  const buildType = searchParams.get('buildType')

  const where: any = {}
  if (hash) where.configHash = hash
  if (buildType) where.buildType = buildType

  const history = await prisma.pricingHistory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json(history)
}
