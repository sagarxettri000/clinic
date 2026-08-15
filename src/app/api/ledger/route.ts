import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'accounts', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const accountId = searchParams.get('accountId') || ''
  const category = searchParams.get('category') || ''
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const sortBy = searchParams.get('sortBy') || 'date'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (accountId) where.accountId = accountId
  if (category) where.category = category

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

  const [transactions, total] = await Promise.all([
    prisma.ledgerTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, code: true, type: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.ledgerTransaction.count({ where }),
  ])

  return NextResponse.json({
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'accounts', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.accountId) {
    return NextResponse.json({ error: 'Account is required' }, { status: 400 })
  }
  if (!body.description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const debitAmount = Number(body.debitAmount) || 0
  const creditAmount = Number(body.creditAmount) || 0

  if (debitAmount < 0 || creditAmount < 0) {
    return NextResponse.json({ error: 'Amounts cannot be negative' }, { status: 400 })
  }

  if (debitAmount === 0 && creditAmount === 0) {
    return NextResponse.json({ error: 'Either debit or credit amount must be greater than 0' }, { status: 400 })
  }

  const account = await prisma.account.findUnique({ where: { id: body.accountId } })
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  const lastTxn = await prisma.ledgerTransaction.findFirst({
    where: { accountId: body.accountId },
    orderBy: { createdAt: 'desc' },
  })
  const previousBalance = lastTxn?.balance || 0
  const newBalance = previousBalance + debitAmount - creditAmount

  const transaction = await prisma.ledgerTransaction.create({
    data: {
      transactionNumber: generateId('TXN'),
      date: body.date ? new Date(body.date) : new Date(),
      description: body.description,
      debitAmount,
      creditAmount,
      balance: newBalance,
      accountId: body.accountId,
      category: body.category || null,
      patientId: body.patientId || null,
      doctorId: body.doctorId || null,
      referenceNumber: body.referenceNumber || null,
      notes: body.notes || null,
      userId: auth.userId,
    },
    include: {
      account: { select: { id: true, name: true, code: true, type: true } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'accounts',
    recordId: transaction.id,
    newValues: { transactionNumber: transaction.transactionNumber, debitAmount, creditAmount, accountId: transaction.accountId },
  })

  return NextResponse.json(transaction, { status: 201 })
}
