import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { generateId } from '@/lib/utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'settlements', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const doctor = await prisma.doctor.findUnique({ where: { id } })
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')

  const andConditions: { fromDate?: { gte: Date }; toDate?: { lte: Date } }[] = []
  if (fromDate) {
    andConditions.push({ fromDate: { gte: new Date(fromDate) } })
  }
  if (toDate) {
    andConditions.push({ toDate: { lte: new Date(toDate) } })
  }

  const where = andConditions.length > 0
    ? { doctorId: id, AND: andConditions }
    : { doctorId: id }

  const settlements = await prisma.doctorSettlement.findMany({
    where,
    orderBy: { fromDate: 'desc' },
  })

  return NextResponse.json({ settlements })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'settlements', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const {
    fromDate,
    toDate,
    amountPaid = 0,
    paymentMethod,
    referenceNumber,
    notes,
  } = body

  if (!fromDate || !toDate) {
    return NextResponse.json(
      { error: 'fromDate and toDate are required' },
      { status: 400 }
    )
  }

  const doctor = await prisma.doctor.findUnique({ where: { id } })
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
  }

  const start = new Date(fromDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(toDate)
  end.setHours(23, 59, 59, 999)

  const completedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: id,
      status: 'COMPLETED',
      appointmentDate: {
        gte: start,
        lte: end,
      },
    },
  })

  const totalConsultations = completedAppointments.length
  const grossRevenue = completedAppointments.reduce(
    (sum, a) => sum + a.consultationFee,
    0
  )

  const doctorShare = (grossRevenue * doctor.revenueSharePercent) / 100

  const previousSettlements = await prisma.doctorSettlement.findMany({
    where: {
      doctorId: id,
      AND: [
        { fromDate: { lte: end } },
        { toDate: { gte: start } },
      ],
    },
  })

  const previouslyPaid = previousSettlements.reduce(
    (sum, s) => sum + s.amountPaid,
    0
  )

  if (amountPaid < 0) {
    return NextResponse.json(
      { error: 'Amount paid cannot be negative' },
      { status: 400 }
    )
  }

  const currentPayable = doctorShare - previouslyPaid
  if (amountPaid > currentPayable) {
    return NextResponse.json(
      { error: `Amount paid exceeds payable (${currentPayable.toFixed(2)})` },
      { status: 400 }
    )
  }
  const remainingPayable = currentPayable - amountPaid

  const settlement = await prisma.$transaction(async (tx) => {
    const newSettlement = await tx.doctorSettlement.create({
      data: {
        doctorId: id,
        fromDate: start,
        toDate: end,
        totalConsultations,
        grossRevenue,
        discounts: 0,
        refunds: 0,
        doctorShare,
        previouslyPaid,
        currentPayable,
        amountPaid,
        remainingPayable,
        paymentMethod: paymentMethod || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        status: amountPaid >= currentPayable ? 'PAID' : amountPaid > 0 ? 'PARTIAL' : 'PENDING',
      },
    })

    if (amountPaid > 0) {
      const cashAccount = await tx.account.findUnique({
        where: { code: '1001' },
      })

      if (cashAccount) {
        const lastTx = await tx.ledgerTransaction.findFirst({
          where: { accountId: cashAccount.id },
          orderBy: { date: 'desc' },
        })
        const currentBalance = lastTx ? lastTx.balance : 0

        await tx.ledgerTransaction.create({
          data: {
            transactionNumber: generateId('TXN'),
            date: new Date(),
            description: 'Doctor settlement payment - ' + doctor.name,
            debitAmount: 0,
            creditAmount: amountPaid,
            balance: currentBalance - amountPaid,
            accountId: cashAccount.id,
            category: 'DOCTOR_SETTLEMENT',
            doctorId: id,
            referenceNumber: referenceNumber || null,
            notes: notes || null,
            userId: auth.userId,
          },
        })
      }
    }

    return newSettlement
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'settlements',
    recordId: settlement.id,
    newValues: { doctorId: id, amountPaid: settlement.amountPaid, doctorShare: settlement.doctorShare, status: settlement.status },
  })

  return NextResponse.json(settlement, { status: 201 })
}
