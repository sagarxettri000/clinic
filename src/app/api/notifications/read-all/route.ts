import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'notifications', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.notification.updateMany({
    where: { isRead: 0 },
    data: { isRead: 1 },
  })

  return NextResponse.json({ ok: true, updated: result.count })
}