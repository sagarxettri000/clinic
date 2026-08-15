import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'encounters', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const encounter = await prisma.encounter.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      vitalSigns: true,
      diagnoses: { orderBy: { isPrimary: 'desc' } },
      treatments: true,
      services: { include: { service: true } },
      prescriptions: {
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      },
      appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true, status: true } },
    },
  })

  if (!encounter) {
    return NextResponse.json({ error: 'Encounter not found' }, { status: 404 })
  }

  return NextResponse.json(encounter)
}
