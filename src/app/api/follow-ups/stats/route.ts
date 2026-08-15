import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'followups', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')

  const where: Record<string, unknown> = {}
  if (patientId) where.patientId = patientId

  const [total, completed, lastFollowUp] = await Promise.all([
    prisma.followUp.count({ where }),
    prisma.followUp.count({ where: { ...where, completedAt: { not: null } } }),
    prisma.followUp.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  return NextResponse.json({
    total,
    completed,
    open: total - completed,
    last: lastFollowUp?.createdAt ?? null,
  })
}