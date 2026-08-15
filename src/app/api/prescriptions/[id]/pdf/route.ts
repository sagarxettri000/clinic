import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'prescriptions', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      encounter: true,
      items: true,
    },
  })

  if (!prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  }

  const clinicSettings = await prisma.clinicSetting.findMany()
  const settingsMap: Record<string, string> = {}
  for (const s of clinicSettings) {
    settingsMap[s.key] = s.value
  }

  return NextResponse.json({
    clinic: {
      name: settingsMap['clinic_name'] || '',
      address: settingsMap['clinic_address'] || '',
      phone: settingsMap['clinic_phone'] || '',
      email: settingsMap['clinic_email'] || '',
      logo: settingsMap['clinic_logo'] || '',
    },
    prescription: {
      id: prescription.id,
      prescriptionNumber: prescription.prescriptionNumber,
      date: prescription.prescriptionDate,
      diagnosis: prescription.diagnosis,
      notes: prescription.notes,
      followUpDate: prescription.followUpDate,
    },
    doctor: {
      name: prescription.doctor.name,
      specialization: prescription.doctor.specialization,
      phone: prescription.doctor.phone,
      signature: prescription.doctor.signature,
    },
    patient: {
      name: prescription.patient.name,
      age: prescription.patient.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(prescription.patient.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : null,
      gender: prescription.patient.gender,
      phone: prescription.patient.phone,
      bloodGroup: prescription.patient.bloodGroup,
      allergies: prescription.patient.allergies,
    },
    items: prescription.items.map((item) => ({
      medicineName: item.medicineName,
      strength: item.strength,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      route: item.route,
      quantity: item.quantity,
      instructions: item.instructions,
    })),
  })
}
