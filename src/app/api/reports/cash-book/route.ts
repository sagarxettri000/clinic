import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { getAccountByCode, DEFAULT_ACCOUNT_CODES } from '@/lib/db-utils'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const accountId = searchParams.get('accountId') || ''

  const where: Record<string, unknown> = {}

  if (accountId) {
    where.accountId = accountId
  } else {
    const cashAccount = await getAccountByCode(DEFAULT_ACCOUNT_CODES.CASH)
    if (cashAccount) {
      where.accountId = cashAccount.id
    }
  }

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

  let openingBalance = 0
  if (where.date && (where.date as Record<string, Date>).gte) {
    const openingWhere: Record<string, unknown> = {
      ...where,
      date: { lt: (where.date as Record<string, Date>).gte },
    }
    const openingBalanceResult = await prisma.ledgerTransaction.aggregate({
      where: openingWhere,
      _sum: { debitAmount: true, creditAmount: true },
    })
    openingBalance =
      (openingBalanceResult._sum.debitAmount || 0) -
      (openingBalanceResult._sum.creditAmount || 0)
  }

  const transactions = await prisma.ledgerTransaction.findMany({
    where,
    include: {
      account: { select: { id: true, name: true, code: true } },
    },
    orderBy: { date: 'asc' },
  })

  const totalDebit = transactions.reduce((sum, t) => sum + t.debitAmount, 0)
  const totalCredit = transactions.reduce((sum, t) => sum + t.creditAmount, 0)
  const closingBalance = openingBalance + totalDebit - totalCredit

  return NextResponse.json({
    account: where.accountId
      ? await prisma.account.findUnique({ where: { id: where.accountId as string }, select: { id: true, name: true, code: true, type: true } })
      : null,
    openingBalance,
    transactions,
    summary: {
      totalDebit,
      totalCredit,
      closingBalance,
    },
  })
}
