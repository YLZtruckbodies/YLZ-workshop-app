import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const jobs = await prisma.jobMaster.findMany({ select: { jobNumber: true } })

  let maxNum = 1093
  for (const j of jobs) {
    const match = j.jobNumber.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > maxNum) maxNum = n
    }
  }

  const next = maxNum + 1
  const jobNumber = `YLZ${next}`
  return NextResponse.json({ jobNumber })
}
