import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { doctorSchema } from '@/lib/validators'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'doctors', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          appointments: true,
        },
      },
      settlements: {
        select: {
          amountPaid: true,
          status: true,
        },
      },
    },
  })

  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const settlementSummary = doctor.settlements.reduce(
    (acc, s) => ({
      totalPaid: acc.totalPaid + s.amountPaid,
      pendingCount:
        acc.pendingCount + (s.status === 'PENDING' ? 1 : 0),
    }),
    { totalPaid: 0, pendingCount: 0 }
  )

  const { settlements, ...doctorData } = doctor

  return NextResponse.json({
    ...doctorData,
    settlementSummary,
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'doctors', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const result = doctorSchema.partial().safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await prisma.doctor.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const data = result.data

  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.specialization !== undefined && {
        specialization: data.specialization || null,
      }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.consultationFee !== undefined && {
        consultationFee: data.consultationFee,
      }),
      ...(data.revenueSharePercent !== undefined && {
        revenueSharePercent: data.revenueSharePercent,
      }),
      ...(data.signature !== undefined && { signature: data.signature || null }),
      ...(data.profilePhoto !== undefined && {
        profilePhoto: data.profilePhoto || null,
      }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'doctors',
    recordId: id,
    newValues: result.data,
  })

  return NextResponse.json(doctor)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'doctors', 'delete')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.doctor.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const doctor = await prisma.doctor.update({
    where: { id },
    data: { status: 'INACTIVE' },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'DELETE',
    module: 'doctors',
    recordId: id,
    previousValues: { name: existing.name },
  })

  return NextResponse.json({ message: 'Doctor deactivated', doctor })
}
