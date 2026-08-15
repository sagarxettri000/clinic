import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { invoiceSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'invoices', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      patient: { select: { id: true, name: true, phone: true, patientId: true, email: true, gender: true, dateOfBirth: true } },
      payments: true,
      encounter: {
        select: {
          id: true,
          encounterDate: true,
          chiefComplaint: true,
          doctor: { select: { id: true, name: true } },
        },
      },
      appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  return NextResponse.json(invoice)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'invoices', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = invoiceSchema.partial().safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.invoice.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const data = result.data
  const updateData: Record<string, unknown> = {}

  if (data.description !== undefined) updateData.description = data.description || null
  if (data.notes !== undefined) updateData.notes = data.notes || null

  let effectiveTotal = existing.totalAmount
  let effectivePaid = data.paidAmount !== undefined ? data.paidAmount : existing.paidAmount

  if (data.items) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })

    const items = data.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice - item.discount
      return {
        invoiceId: id,
        serviceName: item.serviceName,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: lineTotal,
      }
    })

    await prisma.invoiceItem.createMany({ data: items })

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const discount = Math.min(
      data.discount !== undefined ? data.discount : existing.discount,
      subtotal
    )
    const taxPercent = data.taxPercent !== undefined ? data.taxPercent : existing.taxPercent
    const taxAmount = ((subtotal - discount) * taxPercent) / 100
    effectiveTotal = subtotal - discount + taxAmount

    updateData.subtotal = subtotal
    updateData.discount = discount
    updateData.taxPercent = taxPercent
    updateData.taxAmount = taxAmount
    updateData.totalAmount = effectiveTotal
  }

  effectivePaid = Math.min(effectivePaid, effectiveTotal)
  const balance = effectiveTotal - effectivePaid
  updateData.paidAmount = effectivePaid
  updateData.balance = balance
  updateData.status = balance <= 0 ? 'PAID' : effectivePaid > 0 ? 'SENT' : 'DRAFT'

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      items: true,
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'invoices',
    recordId: id,
    newValues: updateData,
  })

  return NextResponse.json(invoice)
}
