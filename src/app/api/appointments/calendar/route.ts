import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'appointments', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'day'
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const doctorId = searchParams.get('doctorId')

  const baseDate = new Date(dateStr)

  let startDate: Date
  let endDate: Date

  switch (view) {
    case 'week':
      startDate = startOfWeek(baseDate, { weekStartsOn: 1 })
      endDate = endOfWeek(baseDate, { weekStartsOn: 1 })
      break
    case 'month':
      startDate = startOfMonth(baseDate)
      endDate = endOfMonth(baseDate)
      break
    case 'day':
    default:
      startDate = startOfDay(baseDate)
      endDate = endOfDay(baseDate)
      break
  }

  const where: Record<string, unknown> = {
    appointmentDate: { gte: startDate, lte: endDate },
  }

  if (doctorId) where.doctorId = doctorId

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
  })

  const grouped: Record<string, typeof appointments> = {}
  for (const apt of appointments) {
    const dateKey = apt.appointmentDate.toISOString().split('T')[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(apt)
  }

  return NextResponse.json({
    view,
    date: dateStr,
    startDate,
    endDate,
    appointments: grouped,
    total: appointments.length,
  })
}
