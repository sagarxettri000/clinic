import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'users', 'view')
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  })

  return NextResponse.json({ success: true, permissions })
}