import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'whatsapp', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    return NextResponse.json({ messages: [] })
  } catch (error) {
    console.error('Get whatsapp messages error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
