import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchMondayItems, normalizeJobNum } from '@/lib/monday'
import { deriveBtype } from '@/lib/jobTypes'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.fullAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const items = await fetchMondayItems()

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const item of items) {
      const num = normalizeJobNum(item.name)
      if (!num || !num.startsWith('YLZ')) {
        skipped++
        continue
      }

      const jobData = {
        type: item.fields.type || '',
        btype: deriveBtype(item.fields.type || ''),
        customer: item.fields.customer || '',
        dealer: item.fields.dealer || '',
        site: item.fields.site || '',
        sheet: item.fields.sheet || '',
        dwg: item.fields.dwg || '',
        mrp: item.fields.mrp || '',
        parts: item.fields.parts || '',
        ebs: item.fields.ebs || '',
        notes: item.fields.notes || '',
        make: item.fields.make || '',
        po: item.fields.po || '',
        dims: item.fields.dims || '',
        vin: item.fields.vin || '',
        prodGroup: item.prodGroup,
      }

      try {
        const existing = await prisma.job.findUnique({ where: { num } })
        if (existing) {
          // Update metadata — never overwrite stage, flag, pairedId, due
          await prisma.job.update({
            where: { num },
            data: jobData,
          })
          updated++
        } else {
          // Create new job starting at Fab stage
          await prisma.job.create({
            data: {
              id: `monday-${item.mondayId}`,
              num,
              stage: 'Fab',
              flag: false,
              ...jobData,
            },
          })
          created++
        }
      } catch (err: any) {
        errors.push(`${num}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: { total: items.length, created, updated, skipped, errors: errors.length },
      errors: errors.slice(0, 10),
    })
  } catch (err: any) {
    console.error('Monday sync error:', err)
    return NextResponse.json(
      { error: 'Sync failed', detail: err.message },
      { status: 500 }
    )
  }
}
