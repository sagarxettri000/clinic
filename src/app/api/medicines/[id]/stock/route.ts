import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stockMovementSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'pharmacy', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = stockMovementSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.medicine.findUnique({ where: { id } })
  if (!existing || existing.isActive !== 1) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
  }

  const { type, quantity, notes, referenceNumber } = result.data

  if (type === 'STOCK_OUT' && existing.stockQuantity < quantity) {
    return NextResponse.json(
      { error: 'Insufficient stock for this adjustment' },
      { status: 400 }
    )
  }

  const previousStock = existing.stockQuantity
  const newStock =
    type === 'STOCK_IN'
      ? previousStock + quantity
      : type === 'STOCK_OUT'
        ? previousStock - quantity
        : quantity

  const [medicine, movement] = await prisma.$transaction([
    prisma.medicine.update({
      where: { id },
      data: { stockQuantity: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        medicineId: id,
        type,
        quantity,
        previousStock,
        newStock,
        referenceNumber: referenceNumber || generateId(type === 'STOCK_IN' ? 'IN' : type === 'STOCK_OUT' ? 'OUT' : 'ADJ', 8),
        notes: notes || null,
        createdById: auth.userId,
      },
    }),
  ])

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'pharmacy',
    recordId: id,
    newValues: {
      movementType: type,
      quantity,
      previousStock,
      newStock,
      medicineName: existing.name,
    },
  })

  return NextResponse.json({ medicine, movement }, { status: 201 })
}
