import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { followUpCompleteSchema } from '@/lib/validators'
import { writeAuditLog } from '@/lib/audit'

export async function POST(
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

  const parsed = followUpCompleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const data = parsed.data

  const followUp = await prisma.followUp.update({
    where: { id },
    data: {
      outcome: data.outcome,
      progress: data.progress,
      currentSymptoms: data.currentSymptoms,
      examinationFindings: data.examinationFindings,
      diagnosisUpdate: data.diagnosisUpdate,
      treatmentResponse: data.treatmentResponse,
      medicationChanges: data.medicationChanges,
      doctorNotes: data.doctorNotes,
      nextAction: data.nextAction,
      nextActionDetails: data.nextActionDetails,
      completedAt: new Date(),
    },
    include: {
      patient: { select: { id: true, name: true, patientId: true } },
      doctor: { select: { id: true, name: true } },
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'followups',
    recordId: id,
    newValues: { outcome: data.outcome },
  })

  return NextResponse.json(followUp)
}