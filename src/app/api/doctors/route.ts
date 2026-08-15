import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { doctorSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'doctors', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  } else {
    where.status = { not: 'INACTIVE' }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { specialization: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.doctor.count({ where }),
  ])

  return NextResponse.json({
    doctors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'doctors', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = doctorSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data

  const doctor = await prisma.doctor.create({
    data: {
      name: data.name,
      specialization: data.specialization || null,
      phone: data.phone || null,
      email: data.email || null,
      consultationFee: data.consultationFee ?? 0,
      revenueSharePercent: data.revenueSharePercent ?? 40,
      signature: data.signature || null,
      profilePhoto: data.profilePhoto || null,
      notes: data.notes || null,
      status: data.status || 'ACTIVE',
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'doctors',
    recordId: doctor.id,
    newValues: { name: data.name, specialization: data.specialization || null },
  })

  return NextResponse.json(doctor, { status: 201 })
}
