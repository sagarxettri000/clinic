import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { patientSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { revalidateTag } from 'next/cache'

export const revalidate = 30

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'patients', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') === 'name' ? 'name' : 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { status: { not: 'ARCHIVED' } }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { patientId: { contains: search, mode: 'insensitive' } },
      { nationalId: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.patient.count({ where }),
  ])

  return NextResponse.json(
    {
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=15' } }
  )
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'patients', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = patientSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data
  const patientId = generateId('PAT')

  const patient = await prisma.patient.create({
    data: {
      patientId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      address: data.address || null,
      nationalId: data.nationalId || null,
      emergencyContact: data.emergencyContact || null,
      bloodGroup: data.bloodGroup || null,
      allergies: data.allergies || null,
      medicalConditions: data.medicalConditions || null,
      currentMedications: data.currentMedications || null,
      notes: data.notes || null,
      status: data.status || 'ACTIVE',
    },
  })

  await prisma.notification.create({
    data: {
      type: 'PATIENT',
      title: 'New patient registered',
      message: `Patient ${patient.name} registered as ${patient.patientId}`,
      metadata: JSON.stringify({ link: `/patients/${patient.id}` }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'patients',
    recordId: patient.id,
    newValues: { name: patient.name, phone: patient.phone, patientId: patient.patientId },
  })

  revalidateTag('patients', 'max')

  return NextResponse.json(patient, { status: 201 })
}
