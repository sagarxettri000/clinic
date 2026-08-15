import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'notifications', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const notification = await prisma.notification.findUnique({ where: { id } })
  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: 1 },
  })

  return NextResponse.json(updated)
}