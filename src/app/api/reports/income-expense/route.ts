import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''

  const where: Record<string, unknown> = {}

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

  // Convention (matches cash book): debitAmount = money in, creditAmount = money out.
  // Payments are recorded as debits, expenses/refunds/settlements as credits.
  const transactions = await prisma.ledgerTransaction.findMany({ where })

  const totalIncome = transactions.reduce((sum, t) => sum + t.debitAmount, 0)
  const totalExpenses = transactions.reduce((sum, t) => sum + t.creditAmount, 0)
  const netBalance = totalIncome - totalExpenses

  const incomeByCategory = new Map<string, number>()
  for (const t of transactions) {
    if ((t.debitAmount ?? 0) > 0) {
      const cat = t.category || 'Other'
      incomeByCategory.set(cat, (incomeByCategory.get(cat) || 0) + t.debitAmount)
    }
  }

  const expenseByCategory = new Map<string, number>()
  for (const t of transactions) {
    if ((t.creditAmount ?? 0) > 0) {
      const cat = t.category || 'Other'
      expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + t.creditAmount)
    }
  }

  return NextResponse.json({
    summary: {
      totalIncome,
      totalExpenses,
      netBalance,
    },
    incomeBreakdown: Array.from(incomeByCategory.entries()).map(([category, amount]) => ({
      category,
      amount,
    })),
    expenseBreakdown: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({
      category,
      amount,
    })),
  })
}
