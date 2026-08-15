import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'appointments', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.appointment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    return NextResponse.json(
      { error: `Cannot check in: appointment is already ${existing.status}` },
      { status: 400 }
    )
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'CHECKED_IN',
      statusHistory: {
        create: {
          fromStatus: existing.status,
          toStatus: 'CHECKED_IN',
          changedBy: auth.userId,
          notes: 'Patient checked in',
        },
      },
    },
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'appointments',
    recordId: id,
    newValues: { status: 'CHECKED_IN' },
  })

  return NextResponse.json(appointment)
}
