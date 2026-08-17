import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { appointmentSchema } from '@/lib/validators'
import { getNextAppointmentNumber } from '@/lib/db-utils'
import { writeAuditLog } from '@/lib/audit'
import { revalidateTag } from 'next/cache'

export const revalidate = 30

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'appointments', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const date = searchParams.get('date')
  const doctorId = searchParams.get('doctorId')
  const patientId = searchParams.get('patientId')
  const status = searchParams.get('status')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    where.appointmentDate = { gte: start, lte: end }
  }

  if (doctorId) where.doctorId = doctorId
  if (patientId) where.patientId = patientId
  if (status) where.status = status

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
      orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ])

  return NextResponse.json({
    appointments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'appointments', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = appointmentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } })
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const appointmentDate = new Date(data.appointmentDate)
  const appointmentNumber = await getNextAppointmentNumber(appointmentDate)

  const appointmentTime = new Date(data.appointmentTime)
  const duration = data.duration ?? 30
  const newStart = appointmentTime.getTime()
  const newEnd = newStart + duration * 60000

  const dayStart = new Date(appointmentDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(appointmentDate)
  dayEnd.setHours(23, 59, 59, 999)

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: data.doctorId,
      appointmentDate: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    },
    select: { appointmentTime: true, duration: true },
  })

  const overlapping = existingAppointments.some((existing) => {
    const existingStart = new Date(existing.appointmentTime).getTime()
    const existingEnd = existingStart + (existing.duration || 30) * 60000
    return newStart < existingEnd && newEnd > existingStart
  })

  if (overlapping) {
    return NextResponse.json(
      { error: 'Doctor already has an appointment in this time slot' },
      { status: 409 }
    )
  }

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNumber,
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentDate,
      appointmentTime,
      duration,
      consultationFee: data.consultationFee ?? doctor.consultationFee,
      doctorSharePercent: data.doctorSharePercent ?? doctor.revenueSharePercent,
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      createdByUserId: auth.userId,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: 'PENDING',
          changedBy: auth.userId,
          notes: 'Appointment created',
        },
      },
    },
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  })

  await prisma.notification.create({
    data: {
      type: 'APPOINTMENT',
      title: 'New appointment scheduled',
      message: `Appointment for ${appointment.patient.name} with ${appointment.doctor.name}`,
      metadata: JSON.stringify({ link: `/appointments/${appointment.id}` }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'appointments',
    recordId: appointment.id,
    newValues: { appointmentNumber, patientId: data.patientId, doctorId: data.doctorId, status: 'PENDING' },
  })

  revalidateTag('appointments', 'max')

  return NextResponse.json(appointment, { status: 201 })
}
