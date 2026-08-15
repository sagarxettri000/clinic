import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { medicineSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'pharmacy', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const stockStatus = searchParams.get('stockStatus') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { isActive: 1 }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { batchNumber: { contains: search, mode: 'insensitive' } },
      { supplier: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (category) where.category = category
  if (stockStatus === 'LOW') {
    where.stockQuantity = { gt: 0, lte: 10 }
  } else if (stockStatus === 'OUT') {
    where.stockQuantity = 0
  }

  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: { _count: { select: { movements: true } } },
    }),
    prisma.medicine.count({ where }),
  ])

  const [lowStockCount, outOfStockCount] = await Promise.all([
    prisma.medicine.count({ where: { isActive: 1, stockQuantity: { lte: 10 } } }),
    prisma.medicine.count({ where: { isActive: 1, stockQuantity: 0 } }),
  ])

  return NextResponse.json({
    medicines,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: { lowStockCount, outOfStockCount },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'pharmacy', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = medicineSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data

  const existing = await prisma.medicine.findFirst({
    where: {
      name: { equals: data.name, mode: 'insensitive' },
      strength: data.strength || null,
      brand: data.brand || null,
    },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'A medicine with this name, strength, and brand already exists' },
      { status: 409 }
    )
  }

  const medicine = await prisma.medicine.create({
    data: {
      name: data.name,
      genericName: data.genericName || null,
      category: data.category || null,
      brand: data.brand || null,
      strength: data.strength || null,
      unit: data.unit || 'TABLET',
      purchasePrice: data.purchasePrice ?? 0,
      sellingPrice: data.sellingPrice ?? 0,
      stockQuantity: data.stockQuantity ?? 0,
      reorderLevel: data.reorderLevel ?? 10,
      batchNumber: data.batchNumber || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      supplier: data.supplier || null,
      location: data.location || null,
      notes: data.notes || null,
      isActive: data.isActive ?? 1,
    },
  })

  if (medicine.stockQuantity > 0) {
    await prisma.stockMovement.create({
      data: {
        medicineId: medicine.id,
        type: 'STOCK_IN',
        quantity: medicine.stockQuantity,
        previousStock: 0,
        newStock: medicine.stockQuantity,
        referenceNumber: `INIT-${medicine.id.slice(0, 8).toUpperCase()}`,
        notes: 'Initial stock on creation',
        createdById: auth.userId,
      },
    })
  }

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'pharmacy',
    recordId: medicine.id,
    newValues: { name: medicine.name, stockQuantity: medicine.stockQuantity },
  })

  return NextResponse.json(medicine, { status: 201 })
}
