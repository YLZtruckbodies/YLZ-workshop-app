import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchBoardMetadata } from '@/lib/monday'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.fullAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const metadata = await fetchBoardMetadata()
    return NextResponse.json(metadata)
  } catch (err: any) {
    console.error('Monday columns error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
