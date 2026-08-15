import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const ALLOWED_SETTING_KEYS = new Set([
  'clinic_name',
  'clinic_phone',
  'clinic_email',
  'clinic_website',
  'clinic_address',
  'clinic_logo',
  'currency',
  'tax_rate',
  'tax_percent',
  'revenue_share_method',
  'payment_methods',
  'appointment_duration',
  'appointment_default_duration',
  'appointment_numbering_mode',
  'appointment_default_status',
  'appointment_auto_confirm',
  'prescription_layout',
  'invoice_layout',
  'receipt_layout',
  'paper_size',
  'print_header',
  'print_footer',
  'whatsapp_provider',
  'whatsapp_phone_number',
  'whatsapp_api_key',
  'whatsapp_api_url',
  'whatsapp_enabled',
  'timezone',
])

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'settings', 'view')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.clinicSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      if (s.key === 'whatsapp_api_key' && s.value) {
        settingsMap[s.key] =
          s.value.length > 4
            ? `***${s.value.slice(-4)}`
            : '***'
        return
      }
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({ success: true, data: settingsMap })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'settings', 'edit')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be an object of key-value pairs' },
        { status: 400 }
      )
    }

    const updates = Object.entries(body) as [string, string][]

    for (const [key, value] of updates) {
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        return NextResponse.json(
          { success: false, error: `Unknown setting key: ${key}` },
          { status: 400 }
        )
      }
      await prisma.clinicSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

    const settings = await prisma.clinicSetting.findMany()
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    const auditValues: Record<string, string> = {}
    for (const [key, value] of updates) {
      if (key === 'whatsapp_api_key') continue
      auditValues[key] = value
    }

    await writeAuditLog({
      userId: auth.userId,
      action: 'UPDATE',
      module: 'settings',
      newValues: auditValues,
    })

    return NextResponse.json({ success: true, data: settingsMap })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
