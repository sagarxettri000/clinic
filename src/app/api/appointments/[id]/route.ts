import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const ALLOWED_STATUSES = new Set(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'appointments', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  return NextResponse.json(appointment)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'appointments', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.appointment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  if (body.paymentStatus !== undefined) {
    return NextResponse.json(
      { error: 'Payment status is derived from payments and cannot be edited directly' },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = {}

  if (body.appointmentDate !== undefined) {
    const date = new Date(body.appointmentDate)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid appointment date' }, { status: 400 })
    }
    updateData.appointmentDate = date
  }
  if (body.appointmentTime !== undefined) {
    const time = new Date(body.appointmentTime)
    if (isNaN(time.getTime())) {
      return NextResponse.json({ error: 'Invalid appointment time' }, { status: 400 })
    }
    updateData.appointmentTime = time
  }
  if (body.duration !== undefined) {
    if (typeof body.duration !== 'number' || body.duration < 1) {
      return NextResponse.json({ error: 'Duration must be at least 1 minute' }, { status: 400 })
    }
    updateData.duration = body.duration
  }
  if (body.consultationFee !== undefined) {
    if (typeof body.consultationFee !== 'number' || body.consultationFee < 0) {
      return NextResponse.json({ error: 'Consultation fee cannot be negative' }, { status: 400 })
    }
    updateData.consultationFee = body.consultationFee
  }
  if (body.doctorSharePercent !== undefined) {
    if (typeof body.doctorSharePercent !== 'number' || body.doctorSharePercent < 0 || body.doctorSharePercent > 100) {
      return NextResponse.json({ error: 'Doctor share must be between 0 and 100' }, { status: 400 })
    }
    updateData.doctorSharePercent = body.doctorSharePercent
  }
  if (body.paymentMethod !== undefined) {
    updateData.paymentMethod = body.paymentMethod
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes
  }

  const rescheduled = updateData.appointmentTime !== undefined || updateData.appointmentDate !== undefined
  if (rescheduled) {
    const newTime = (updateData.appointmentTime as Date) || existing.appointmentTime
    const newDate = (updateData.appointmentDate as Date) || existing.appointmentDate
    const newStart = newTime.getTime()
    const newEnd = newStart + ((updateData.duration as number) || existing.duration) * 60000

    const dayStart = new Date(newDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(newDate)
    dayEnd.setHours(23, 59, 59, 999)

    const conflicts = await prisma.appointment.findMany({
      where: {
        id: { not: id },
        doctorId: existing.doctorId,
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
      select: { appointmentTime: true, duration: true },
    })

    const overlapping = conflicts.some((c) => {
      const s = new Date(c.appointmentTime).getTime()
      const e = s + (c.duration || 30) * 60000
      return newStart < e && newEnd > s
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Doctor already has an appointment in this time slot' },
        { status: 409 }
      )
    }
  }

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid appointment status' }, { status: 400 })
    }
    if (body.status !== existing.status) {
      updateData.status = body.status

      await prisma.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: existing.status,
          toStatus: body.status,
          changedBy: auth.userId,
          notes: body.statusReason || null,
        },
      })
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'appointments',
    recordId: id,
    newValues: updateData,
  })

  return NextResponse.json(appointment)
}
