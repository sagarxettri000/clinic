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
      items: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!prescription) {
    return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  }

  return NextResponse.json(prescription)
}
