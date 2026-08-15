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

  where.status = 'COMPLETED'

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { select: { id: true, name: true, specialization: true, revenueSharePercent: true } },
    },
  })

  const doctorMap = new Map<
    string,
    {
      doctorId: string
      doctorName: string
      specialization: string | null
      totalConsultations: number
      grossRevenue: number
      doctorShare: number
      clinicShare: number
    }
  >()

  for (const apt of appointments) {
    const existing = doctorMap.get(apt.doctorId)
    const sharePercent = apt.doctorSharePercent
    const doctorShare = (apt.consultationFee * sharePercent) / 100
    const clinicShare = apt.consultationFee - doctorShare

    if (existing) {
      existing.totalConsultations += 1
      existing.grossRevenue += apt.consultationFee
      existing.doctorShare += doctorShare
      existing.clinicShare += clinicShare
    } else {
      doctorMap.set(apt.doctorId, {
        doctorId: apt.doctorId,
        doctorName: apt.doctor.name,
        specialization: apt.doctor.specialization,
        totalConsultations: 1,
        grossRevenue: apt.consultationFee,
        doctorShare,
        clinicShare,
      })
    }
  }

  const report = Array.from(doctorMap.values())

  const totals = report.reduce(
    (acc, r) => ({
      totalConsultations: acc.totalConsultations + r.totalConsultations,
      totalGrossRevenue: acc.totalGrossRevenue + r.grossRevenue,
      totalDoctorShare: acc.totalDoctorShare + r.doctorShare,
      totalClinicShare: acc.totalClinicShare + r.clinicShare,
    }),
    { totalConsultations: 0, totalGrossRevenue: 0, totalDoctorShare: 0, totalClinicShare: 0 }
  )

  return NextResponse.json({ report, totals })
}
