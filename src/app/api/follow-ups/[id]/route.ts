import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { followUpSchema } from '@/lib/validators'
import { writeAuditLog } from '@/lib/audit'

const FOLLOW_UP_INCLUDE = {
  patient: { select: { id: true, name: true, phone: true, patientId: true, dateOfBirth: true, gender: true } },
  doctor: { select: { id: true, name: true, specialization: true } },
  encounter: {
    include: {
      doctor: { select: { id: true, name: true } },
      diagnoses: { orderBy: { isPrimary: 'desc' as const } },
      treatments: true,
    },
  },
  relatedPrescription: { include: { items: true } },
  encounters: {
    include: {
      doctor: { select: { id: true, name: true } },
      diagnoses: { orderBy: { isPrimary: 'desc' as const } },
      treatments: true,
      services: { include: { service: true } },
    },
    orderBy: { encounterDate: 'desc' as const },
  },
  prescriptions: {
    include: { items: true },
    orderBy: { prescriptionDate: 'desc' as const },
  },
  invoices: { orderBy: { invoiceDate: 'desc' as const } },
} as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'followups', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const followUp = await prisma.followUp.findUnique({
    where: { id },
    include: FOLLOW_UP_INCLUDE,
  })

  if (!followUp) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  return NextResponse.json(followUp)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'followups', 'edit')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.followUp.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  const parsed = followUpSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const data = parsed.data

  if (data.patientId && data.patientId !== existing.patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
  }

  if (data.doctorId && data.doctorId !== existing.doctorId) {
    const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } })
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }
  }

  const updateData: Record<string, unknown> = {}

  if (data.patientId) updateData.patientId = data.patientId
  if (data.doctorId) updateData.doctorId = data.doctorId
  if (data.encounterId !== undefined) updateData.encounterId = data.encounterId || null
  if (data.relatedPrescriptionId !== undefined) updateData.relatedPrescriptionId = data.relatedPrescriptionId || null
  if (data.reason !== undefined) updateData.reason = data.reason
  if (data.objective !== undefined) updateData.objective = data.objective
  if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis
  if (data.clinicalNotes !== undefined) updateData.clinicalNotes = data.clinicalNotes
  if (data.doctorInstructions !== undefined) updateData.doctorInstructions = data.doctorInstructions

  const followUp = await prisma.followUp.update({
    where: { id },
    data: updateData,
    include: FOLLOW_UP_INCLUDE,
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'followups',
    recordId: id,
    newValues: updateData,
  })

  return NextResponse.json(followUp)
}