import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { refundSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { getCashOrBankAccount } from '@/lib/db-utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'payments', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const patientId = searchParams.get('patientId') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (patientId) where.patientId = patientId

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        payment: { select: { id: true, paymentNumber: true, amount: true, paymentMethod: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.refund.count({ where }),
  ])

  return NextResponse.json({
    refunds,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'payments', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = refundSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data

  const originalPayment = await prisma.payment.findUnique({
    where: { id: data.paymentId },
  })
  if (!originalPayment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  const existingRefunds = await prisma.refund.findMany({
    where: {
      paymentId: data.paymentId,
      status: { not: 'CANCELLED' },
    },
  })
  const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0)
  const maxRefundable = originalPayment.amount - totalRefunded

  if (data.amount > maxRefundable) {
    return NextResponse.json(
      { error: `Refund amount exceeds refundable balance. Max refundable: ${maxRefundable}` },
      { status: 400 }
    )
  }

  const resolvedPatientId = data.patientId || originalPayment.patientId

  const patient = await prisma.patient.findUnique({ where: { id: resolvedPatientId } })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const refundNumber = generateId('REF')

  const refund = await prisma.refund.create({
    data: {
      refundNumber,
      paymentId: data.paymentId,
      patientId: resolvedPatientId,
      amount: data.amount,
      reason: data.reason,
      refundMethod: data.refundMethod,
      status: 'COMPLETED',
    },
  })

  const totalRefundedAfter = totalRefunded + data.amount
  if (totalRefundedAfter >= originalPayment.amount) {
    await prisma.payment.update({
      where: { id: data.paymentId },
      data: { status: 'REFUNDED' },
    })
  } else {
    await prisma.payment.update({
      where: { id: data.paymentId },
      data: { status: 'PARTIAL_REFUND' },
    })
  }

  if (originalPayment.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: originalPayment.invoiceId },
    })
    if (invoice) {
      const newPaidAmount = Math.max(0, invoice.paidAmount - data.amount)
      const newBalance = invoice.totalAmount - newPaidAmount
      await prisma.invoice.update({
        where: { id: originalPayment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newPaidAmount <= 0 ? 'DRAFT' : 'SENT',
        },
      })

      if (invoice.appointmentId) {
        await prisma.appointment.update({
          where: { id: invoice.appointmentId },
          data: {
            paymentStatus:
              newPaidAmount <= 0 ? 'UNPAID' : newBalance > 0 ? 'PARTIALLY_PAID' : 'PAID',
          },
        })
      }
    }
  }

  const account = await getCashOrBankAccount(originalPayment.paymentMethod)

  if (account) {
    const lastTxn = await prisma.ledgerTransaction.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    })
    const previousBalance = lastTxn?.balance || 0
    const newBalance = previousBalance - data.amount

    await prisma.ledgerTransaction.create({
      data: {
        transactionNumber: generateId('TXN'),
        date: new Date(),
        description: `Refund to ${patient.name} - ${data.reason}`,
        debitAmount: 0,
        creditAmount: data.amount,
        balance: newBalance,
        accountId: account.id,
        category: 'REFUND',
        patientId: resolvedPatientId,
        refundId: refund.id,
        paymentId: data.paymentId,
        userId: auth.userId,
      },
    })
  }

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'refunds',
    recordId: refund.id,
    newValues: { refundNumber: refund.refundNumber, amount: refund.amount, paymentId: refund.paymentId },
  })

  return NextResponse.json(refund, { status: 201 })
}
