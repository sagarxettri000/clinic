import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { followUpSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { writeAuditLog } from '@/lib/audit'

const FOLLOW_UP_INCLUDE = {
  patient: { select: { id: true, name: true, phone: true, patientId: true, dateOfBirth: true } },
  doctor: { select: { id: true, name: true, specialization: true } },
  encounter: {
    select: {
      id: true,
      encounterDate: true,
      chiefComplaint: true,
      doctor: { select: { id: true, name: true } },
    },
  },
  relatedPrescription: {
    select: { id: true, prescriptionNumber: true, prescriptionDate: true },
  },
  prescriptions: { select: { id: true, prescriptionNumber: true, prescriptionDate: true } },
  invoices: { select: { id: true, invoiceNumber: true, invoiceDate: true, totalAmount: true, status: true } },
} as const

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'followups', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const patientId = searchParams.get('patientId')
  const doctorId = searchParams.get('doctorId')
  const search = searchParams.get('search')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (patientId) where.patientId = patientId
  if (doctorId) where.doctorId = doctorId

  if (search) {
    const q = search.toLowerCase()
    where.OR = [
      { followUpNumber: { contains: q } },
      { reason: { contains: q } },
      { doctor: { name: { contains: q } } },
      { patient: { name: { contains: q } } },
      { diagnosis: { contains: q } },
    ]
  }

  const [followUps, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      include: FOLLOW_UP_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.followUp.count({ where }),
  ])

  return NextResponse.json({
    followUps,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'followups', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = followUpSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } })
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  if (data.encounterId) {
    const encounter = await prisma.encounter.findUnique({ where: { id: data.encounterId } })
    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 })
    }
    if (encounter.patientId !== data.patientId) {
      return NextResponse.json(
        { error: 'Related encounter does not belong to this patient' },
        { status: 400 }
      )
    }
  }

  const followUpNumber = generateId('FU', 8)

  const followUp = await prisma.followUp.create({
    data: {
      followUpNumber,
      patientId: data.patientId,
      doctorId: data.doctorId,
      encounterId: data.encounterId || null,
      relatedPrescriptionId: data.relatedPrescriptionId || null,
      reason: data.reason,
      objective: data.objective,
      diagnosis: data.diagnosis,
      clinicalNotes: data.clinicalNotes,
      doctorInstructions: data.doctorInstructions,
      createdById: auth.userId,
    },
    include: FOLLOW_UP_INCLUDE,
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'followups',
    recordId: followUp.id,
    newValues: { followUpNumber: followUp.followUpNumber, patientId: followUp.patientId },
  })

  return NextResponse.json(followUp, { status: 201 })
}