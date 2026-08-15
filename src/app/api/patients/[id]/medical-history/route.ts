import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'patients', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const patient = await prisma.patient.findUnique({ where: { id } })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const encounters = await prisma.encounter.findMany({
    where: { patientId: id },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialization: true,
        },
      },
      vitalSigns: true,
      diagnoses: true,
      treatments: true,
      prescriptions: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { encounterDate: 'desc' },
  })

  return NextResponse.json({ encounters })
}
