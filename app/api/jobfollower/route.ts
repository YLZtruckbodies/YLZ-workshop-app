import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/jobfollower?jobNum=YLZ1080
export async function GET(req: NextRequest) {
  const jobNum = new URL(req.url).searchParams.get('jobNum')
  if (!jobNum) return NextResponse.json({ error: 'jobNum required' }, { status: 400 })

  const checks = await prisma.jobFollowerCheck.findMany({ where: { jobNum } })
  // Return as a map: { "pre-production.job-sheet-received": { checked: true, checkedBy: "Matt", checkedAt: "..." } }
  const map: Record<string, { checked: boolean; checkedBy: string; checkedAt: string | null }> = {}
  checks.forEach((c: any) => {
    map[c.checkKey] = {
      checked: c.checked,
      checkedBy: c.checkedBy,
      checkedAt: c.checkedAt?.toISOString() || null,
    }
  })
  return NextResponse.json(map)
}

// POST /api/jobfollower  { jobNum, checkKey, checked, checkedBy }
export async function POST(req: NextRequest) {
  const { jobNum, checkKey, checked, checkedBy } = await req.json()
  if (!jobNum || !checkKey) return NextResponse.json({ error: 'jobNum and checkKey required' }, { status: 400 })

  const result = await prisma.jobFollowerCheck.upsert({
    where: { jobNum_checkKey: { jobNum, checkKey } },
    update: {
      checked: !!checked,
      checkedBy: checkedBy || '',
      checkedAt: checked ? new Date() : null,
    },
    create: {
      jobNum,
      checkKey,
      checked: !!checked,
      checkedBy: checkedBy || '',
      checkedAt: checked ? new Date() : null,
    },
  })
  return NextResponse.json(result)
}
