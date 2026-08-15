import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const doctorId = searchParams.get('doctorId') || ''
  const status = searchParams.get('status') || ''

  const where: Record<string, unknown> = {}

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.appointmentDate = dateFilter
  }

  if (doctorId) where.doctorId = doctorId
  if (status) where.status = status
  else where.status = { notIn: ['CANCELLED', 'NO_SHOW'] }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
      payments: { select: { id: true, amount: true, paymentMethod: true, status: true } },
    },
    orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
  })

  const summary = appointments.reduce(
    (acc, apt) => ({
      totalAppointments: acc.totalAppointments + 1,
      totalRevenue: acc.totalRevenue + apt.consultationFee,
      totalCollected:
        acc.totalCollected +
        apt.payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0),
    }),
    { totalAppointments: 0, totalRevenue: 0, totalCollected: 0 }
  )

  return NextResponse.json({ appointments, summary })
}
