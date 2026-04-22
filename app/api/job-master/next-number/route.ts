import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [masters, jobs] = await Promise.all([
    prisma.jobMaster.findMany({ select: { jobNumber: true } }),
    prisma.job.findMany({ select: { num: true } }),
  ])

  let maxNum = 1122
  for (const j of masters) {
    const match = j.jobNumber.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }
  for (const j of jobs) {
    const match = j.num.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }

  const next = maxNum + 1
  const jobNumber = `YLZ${next}`
  return NextResponse.json({ jobNumber })
}
