import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'expenses', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const categories = await prisma.expenseCategory.findMany({
    where: { isActive: 1 },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ categories })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'expenses', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
  }

  const existing = await prisma.expenseCategory.findFirst({
    where: { name: body.name.trim() },
  })

  if (existing) {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
  }

  const category = await prisma.expenseCategory.create({
    data: {
      name: body.name.trim(),
      description: body.description || null,
      isActive: 1,
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'expenses',
    recordId: category.id,
    newValues: { name: category.name },
  })

  return NextResponse.json(category, { status: 201 })
}
