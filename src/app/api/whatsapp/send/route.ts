import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'whatsapp', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { to, message } = body || {}

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Both "to" and "message" are required' },
        { status: 400 }
      )
    }

    console.log('Queued WhatsApp message:', { to, message })

    return NextResponse.json({ success: true, message: 'Queued' })
  } catch (error) {
    console.error('Send whatsapp message error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
