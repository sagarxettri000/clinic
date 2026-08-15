import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { medicineSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'pharmacy', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const medicine = await prisma.medicine.findUnique({
    where: { id },
    include: {
      movements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!medicine) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
  }

  return NextResponse.json(medicine)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'pharmacy', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = medicineSchema.partial().safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.medicine.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
  }

  const data = result.data

  if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await prisma.medicine.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        strength: data.strength !== undefined ? data.strength || null : existing.strength,
        brand: data.brand !== undefined ? data.brand || null : existing.brand,
      },
    })
    if (dup && dup.id !== id) {
      return NextResponse.json(
        { error: 'A medicine with this name, strength, and brand already exists' },
        { status: 409 }
      )
    }
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.genericName !== undefined && { genericName: data.genericName || null }),
      ...(data.category !== undefined && { category: data.category || null }),
      ...(data.brand !== undefined && { brand: data.brand || null }),
      ...(data.strength !== undefined && { strength: data.strength || null }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
      ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
      ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
      ...(data.batchNumber !== undefined && { batchNumber: data.batchNumber || null }),
      ...(data.expiryDate !== undefined && {
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      }),
      ...(data.supplier !== undefined && { supplier: data.supplier || null }),
      ...(data.location !== undefined && { location: data.location || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'pharmacy',
    recordId: id,
    newValues: { name: medicine.name, reorderLevel: medicine.reorderLevel },
  })

  return NextResponse.json(medicine)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'pharmacy', 'delete')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.medicine.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
  }

  const medicine = await prisma.medicine.update({
    where: { id },
    data: { isActive: 0 },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'DELETE',
    module: 'pharmacy',
    recordId: id,
    previousValues: { name: existing.name },
  })

  return NextResponse.json({ message: 'Medicine deactivated', medicine })
}
