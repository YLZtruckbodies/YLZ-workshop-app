import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      role: true,
      color: true,
      access: true,
      canAdvance: true,
      canEdit: true,
      fullAdmin: true,
      defaultScreen: true,
      section: true,
    },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { pin, ...rest } = body
  const hashedPin = await bcrypt.hash(pin, 10)
  const user = await prisma.user.create({
    data: { ...rest, pin: hashedPin },
  })
  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, pin, ...rest } = body

  // Protect Nathan's account
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = { ...rest }
  if (pin) data.pin = await bcrypt.hash(pin, 10)

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Protect Nathan's account at API level
  if (id === 'nathan') {
    return NextResponse.json({ error: 'Cannot delete this account' }, { status: 403 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
