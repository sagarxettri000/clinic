import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'users', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const mod = searchParams.get('module') || ''
  const auditUserId = searchParams.get('userId') || ''
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (mod) where.module = mod
  if (auditUserId) where.userId = auditUserId

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.createdAt = dateFilter
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
