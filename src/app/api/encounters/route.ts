import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { encounterSchema } from '@/lib/validators'
import { calculateBmi } from '@/lib/utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'encounters', 'view')
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
    const encounterDate: Record<string, Date> = {}
    if (startDate) encounterDate.gte = new Date(startDate)
    if (endDate) encounterDate.lte = new Date(endDate)
    where.encounterDate = encounterDate
  }

  const [encounters, total] = await Promise.all([
    prisma.encounter.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        vitalSigns: true,
        diagnoses: { orderBy: { isPrimary: 'desc' } },
        treatments: true,
        services: { include: { service: true } },
      },
      orderBy: { encounterDate: 'desc' },
      skip,
      take: limit,
    }),
    prisma.encounter.count({ where }),
  ])

  return NextResponse.json({
    encounters,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'encounters', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = encounterSchema.safeParse(body)

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

  if (data.appointmentId) {
    const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId } })
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
  }

  const encounter = await prisma.encounter.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctorId,
      appointmentId: data.appointmentId || null,
      followUpId: data.followUpId || null,
      status: data.status || 'COMPLETED',
      chiefComplaint: data.chiefComplaint,
      historyOfPresentIllness: data.historyOfPresentIllness,
      examinationFindings: data.examinationFindings,
      clinicalNotes: data.clinicalNotes,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      additionalInstructions: data.additionalInstructions,
    },
  })

  if (data.vitalSigns) {
    const vs = data.vitalSigns

    let systolic = vs.bloodPressureSystolic
    let diastolic = vs.bloodPressureDiastolic
    if (vs.bloodPressure) {
      const parts = vs.bloodPressure.split('/').map((p) => Number(p.trim()))
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        systolic = parts[0]
        diastolic = parts[1]
      }
    }

    const bmi =
      vs.weight && vs.height ? calculateBmi(vs.weight, vs.height) : null

    await prisma.vitalSign.create({
      data: {
        encounterId: encounter.id,
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        pulse: vs.pulse,
        temperature: vs.temperature,
        respiratoryRate: vs.respiratoryRate,
        spo2: vs.spo2,
        weight: vs.weight,
        height: vs.height,
        bmi,
      },
    })
  }

  if (data.diagnoses && data.diagnoses.length > 0) {
    await prisma.diagnosis.createMany({
      data: data.diagnoses.map((d) => ({
        encounterId: encounter.id,
        code: d.code || null,
        description: d.description,
        isPrimary: d.isPrimary,
      })),
    })
  }

  if (data.treatments && data.treatments.length > 0) {
    await prisma.treatment.createMany({
      data: data.treatments.map((t) => ({
        encounterId: encounter.id,
        description: t.description,
        notes: t.notes || null,
      })),
    })
  }

  if (data.services && data.services.length > 0) {
    for (const svc of data.services) {
      const service = await prisma.service.findUnique({
        where: { id: svc.serviceId },
      })
      if (service) {
        await prisma.encounterService.create({
          data: {
            encounterId: encounter.id,
            serviceId: service.id,
            quantity: svc.quantity ?? 1,
            price: service.price,
            notes: svc.notes || null,
          },
        })
      }
    }
  }

  const fullEncounter = await prisma.encounter.findUnique({
    where: { id: encounter.id },
    include: {
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
      vitalSigns: true,
      diagnoses: true,
      treatments: true,
      services: { include: { service: true } },
      appointment: { select: { id: true, appointmentNumber: true, appointmentDate: true } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'encounters',
    recordId: encounter.id,
    newValues: { patientId: data.patientId, doctorId: data.doctorId },
  })

  return NextResponse.json(fullEncounter, { status: 201 })
}
