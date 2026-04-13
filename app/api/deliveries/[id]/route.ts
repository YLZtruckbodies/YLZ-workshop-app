import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['pending', 'deposit-paid', 'invoiced', 'paid', 'overdue']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.canEdit && !user?.fullAdmin) {
      return NextResponse.json({ error: 'No permission to edit' }, { status: 403 })
    }

    const body = await req.json()

    // Validate paymentStatus if provided
    const data: any = {}
    if (body.paymentStatus !== undefined) {
      data.paymentStatus = VALID_STATUSES.includes(body.paymentStatus) ? body.paymentStatus : 'pending'
    }
    if (body.invoiceAmount !== undefined) data.invoiceAmount = Math.max(0, Number(body.invoiceAmount) || 0)
    if (body.depositAmount !== undefined) data.depositAmount = Math.max(0, Number(body.depositAmount) || 0)
    if (body.depositPaid !== undefined) data.depositPaid = Boolean(body.depositPaid)
    if (body.invoiceNum !== undefined) data.invoiceNum = String(body.invoiceNum)
    if (body.deliveryDate !== undefined) data.deliveryDate = String(body.deliveryDate)
    if (body.paymentDue !== undefined) data.paymentDue = String(body.paymentDue)
    if (body.paymentDate !== undefined) data.paymentDate = String(body.paymentDate)
    if (body.notes !== undefined) data.notes = String(body.notes)

    const delivery = await prisma.delivery.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(delivery)
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }
    console.error('PATCH /api/deliveries/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.fullAdmin) {
      return NextResponse.json({ error: 'Only admins can delete delivery records' }, { status: 403 })
    }

    await prisma.delivery.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }
    console.error('DELETE /api/deliveries/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete delivery' }, { status: 500 })
  }
}
