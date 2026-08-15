import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { expenseSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { getCashOrBankAccount } from '@/lib/db-utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'expenses', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const categoryId = searchParams.get('categoryId') || ''
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (categoryId) where.categoryId = categoryId

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.date = dateFilter
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ])

  return NextResponse.json({
    expenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'expenses', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = expenseSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data

  const category = await prisma.expenseCategory.findUnique({ where: { id: data.categoryId } })
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const expenseNumber = generateId('EXP')

  const expense = await prisma.expense.create({
    data: {
      expenseNumber,
      date: data.date ? new Date(data.date) : new Date(),
      categoryId: data.categoryId,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      supplier: data.supplier || null,
      notes: data.notes || null,
      createdById: auth.userId,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  })

  const account = await getCashOrBankAccount(data.paymentMethod)

  if (account) {
    const lastTxn = await prisma.ledgerTransaction.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    })
    const previousBalance = lastTxn?.balance || 0
    const newBalance = previousBalance - data.amount

    await prisma.ledgerTransaction.create({
      data: {
        transactionNumber: generateId('TXN'),
        date: new Date(),
        description: `Expense: ${data.description}`,
        debitAmount: 0,
        creditAmount: data.amount,
        balance: newBalance,
        accountId: account.id,
        category: category.name,
        expenseId: expense.id,
        userId: auth.userId,
      },
    })
  }

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'expenses',
    recordId: expense.id,
    newValues: { expenseNumber, amount: data.amount, categoryId: data.categoryId },
  })

  return NextResponse.json(expense, { status: 201 })
}
