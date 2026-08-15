import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { prescriptionSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'prescriptions', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const patientId = searchParams.get('patientId')
  const doctorId = searchParams.get('doctorId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (patientId) where.patientId = patientId
  if (doctorId) where.doctorId = doctorId
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.prescriptionDate = dateFilter
  }

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        items: true,
      },
      orderBy: { prescriptionDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.prescription.count({ where }),
  ])

  return NextResponse.json({
    prescriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'prescriptions', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = prescriptionSchema.safeParse(body)

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

  const prescriptionNumber = generateId('RX', 8)

  const prescription = await prisma.prescription.create({
    data: {
      prescriptionNumber,
      patientId: data.patientId,
      doctorId: data.doctorId,
      encounterId: data.encounterId || null,
      followUpId: data.followUpId || null,
      diagnosis: data.diagnosis,
      notes: data.notes,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      items: {
        create: data.items.map((item) => ({
          medicineName: item.medicineName,
          strength: item.strength,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
      },
    },
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
      items: true,
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'prescriptions',
    recordId: prescription.id,
    newValues: { prescriptionNumber, patientId: data.patientId, doctorId: data.doctorId },
  })

  return NextResponse.json(prescription, { status: 201 })
}
