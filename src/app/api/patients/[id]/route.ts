import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { patientSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'patients', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          appointments: true,
          encounters: true,
          prescriptions: true,
          invoices: true,
        },
      },
    },
  })

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  return NextResponse.json(patient)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'patients', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = patientSchema.partial().safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.patient.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const data = result.data

  const patient = await prisma.patient.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }),
      ...(data.gender !== undefined && { gender: data.gender || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.nationalId !== undefined && { nationalId: data.nationalId || null }),
      ...(data.emergencyContact !== undefined && {
        emergencyContact: data.emergencyContact || null,
      }),
      ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup || null }),
      ...(data.allergies !== undefined && { allergies: data.allergies || null }),
      ...(data.medicalConditions !== undefined && {
        medicalConditions: data.medicalConditions || null,
      }),
      ...(data.currentMedications !== undefined && {
        currentMedications: data.currentMedications || null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'patients',
    recordId: id,
    newValues: data,
  })

  return NextResponse.json(patient)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'patients', 'delete')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.patient.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'DELETE',
    module: 'patients',
    recordId: id,
  })

  return NextResponse.json({ message: 'Patient archived', patient })
}
