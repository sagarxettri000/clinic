import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { paymentSchema } from '@/lib/validators'
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
  const search = searchParams.get('search') || ''
  const patientId = searchParams.get('patientId') || ''
  const paymentMethod = searchParams.get('paymentMethod') || ''
  const fromDate = searchParams.get('fromDate') || ''
  const toDate = searchParams.get('toDate') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { paymentNumber: { contains: search, mode: 'insensitive' } },
      { patient: { name: { contains: search, mode: 'insensitive' } } },
      { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
    ]
  }

  if (patientId) where.patientId = patientId
  if (paymentMethod) where.paymentMethod = paymentMethod

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }
    where.paymentDate = dateFilter
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ])

  return NextResponse.json({
    payments,
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
  const result = paymentSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const data = result.data

  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  let linkedInvoice: Awaited<ReturnType<typeof prisma.invoice.findUnique>> | null = null
  if (data.invoiceId) {
    linkedInvoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } })
    if (!linkedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (linkedInvoice.patientId !== data.patientId) {
      return NextResponse.json(
        { error: 'Payment patient does not match the invoice patient' },
        { status: 400 }
      )
    }
    if (data.amount > linkedInvoice.balance + 0.001) {
      return NextResponse.json(
        { error: `Payment amount exceeds invoice balance. Balance: ${linkedInvoice.balance}` },
        { status: 400 }
      )
    }
    if (linkedInvoice.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot pay a cancelled invoice' }, { status: 400 })
    }
  }

  const duplicateWindow = new Date(Date.now() - 60_000)
  const duplicate = await prisma.payment.findFirst({
    where: {
      patientId: data.patientId,
      invoiceId: data.invoiceId || null,
      appointmentId: data.appointmentId || null,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: 'COMPLETED',
      createdAt: { gte: duplicateWindow },
    },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: 'Duplicate payment detected. This payment may have already been recorded.' },
      { status: 409 }
    )
  }

  const paymentNumber = generateId('PAY')

  const payment = await prisma.payment.create({
    data: {
      paymentNumber,
      patientId: data.patientId,
      appointmentId: data.appointmentId || null,
      invoiceId: data.invoiceId || null,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
      status: 'COMPLETED',
    },
  })

  if (data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } })
    if (invoice) {
      const newPaidAmount = invoice.paidAmount + data.amount
      const newBalance = invoice.totalAmount - newPaidAmount
      let newStatus = invoice.status
      if (newBalance <= 0) {
        newStatus = 'PAID'
      } else if (newPaidAmount > 0) {
        newStatus = 'SENT'
      }
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balance: Math.max(0, newBalance),
          status: newStatus,
        },
      })

      if (invoice.appointmentId) {
        await prisma.appointment.update({
          where: { id: invoice.appointmentId },
          data: {
            paymentStatus:
              newBalance <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          },
        })
      }
    }
  }

  const account = await getCashOrBankAccount(data.paymentMethod)

  if (account) {
    const lastTxn = await prisma.ledgerTransaction.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    })
    const previousBalance = lastTxn?.balance || 0
    const newBalance = previousBalance + data.amount

    await prisma.ledgerTransaction.create({
      data: {
        transactionNumber: generateId('TXN'),
        date: new Date(),
        description: `Payment received from ${patient.name} - ${data.paymentMethod}`,
        debitAmount: data.amount,
        creditAmount: 0,
        balance: newBalance,
        accountId: account.id,
        category: 'CONSULTATION_INCOME',
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
        invoiceId: data.invoiceId || null,
        paymentId: payment.id,
        referenceNumber: data.referenceNumber || null,
        userId: auth.userId,
      },
    })
  }

  await prisma.notification.create({
    data: {
      type: 'PAYMENT',
      title: 'Payment received',
      message: `Payment of ${data.amount} received from ${patient.name}`,
      metadata: JSON.stringify({
        link: data.invoiceId ? `/billing/invoices/${data.invoiceId}` : `/patients/${data.patientId}`,
      }),
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'payments',
    recordId: payment.id,
    newValues: { paymentNumber: payment.paymentNumber, amount: payment.amount, invoiceId: payment.invoiceId },
  })

  return NextResponse.json(payment, { status: 201 })
}
