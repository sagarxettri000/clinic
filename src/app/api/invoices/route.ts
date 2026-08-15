import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { invoiceSchema } from '@/lib/validators'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/permissions'
import { getCashOrBankAccount } from '@/lib/db-utils'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'invoices', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const patientId = searchParams.get('patientId') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { patient: { name: { contains: search } } },
    ]
  }

  if (patientId) {
    where.patientId = patientId
  }

  if (status) {
    where.status = status
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, phone: true, patientId: true } },
        items: true,
        payments: true,
        encounter: {
          select: {
            id: true,
            encounterDate: true,
            chiefComplaint: true,
            doctor: { select: { id: true, name: true } },
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentNumber: true,
            appointmentDate: true,
            doctor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])

  return NextResponse.json({
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'invoices', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = invoiceSchema.safeParse(body)

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

  if (data.encounterId) {
    const encounter = await prisma.encounter.findUnique({
      where: { id: data.encounterId },
    })
    if (!encounter) {
      return NextResponse.json({ error: 'Encounter not found' }, { status: 404 })
    }
    if (encounter.patientId !== data.patientId) {
      return NextResponse.json(
        { error: 'Encounter does not belong to the selected patient' },
        { status: 400 }
      )
    }
  }

  if (data.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
    })
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }
  }

  if (data.followUpId) {
    const followUp = await prisma.followUp.findUnique({
      where: { id: data.followUpId },
    })
    if (!followUp) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
    }
    if (followUp.patientId !== data.patientId) {
      return NextResponse.json(
        { error: 'Follow-up does not belong to the selected patient' },
        { status: 400 }
      )
    }
  }

  const invoiceNumber = generateId('INV')

  const items = data.items.map((item) => {
    const lineTotal = item.quantity * item.unitPrice - item.discount
    return {
      serviceName: item.serviceName,
      description: item.description || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: lineTotal,
    }
  })

  const subtotal = items.reduce(
    (sum, item) => sum + item.total,
    0
  )
  const discount = Math.min(data.discount || 0, subtotal)
  const taxableAmount = subtotal - discount
  const taxAmount = (taxableAmount * (data.taxPercent || 0)) / 100
  const totalAmount = taxableAmount + taxAmount
  const paidAmount = Math.min(data.paidAmount || 0, totalAmount)
  const balance = totalAmount - paidAmount
  const status =
    balance <= 0 ? 'PAID' : paidAmount > 0 ? 'SENT' : 'DRAFT'

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId: data.patientId,
      appointmentId: data.appointmentId || null,
      encounterId: data.encounterId || null,
      followUpId: data.followUpId || null,
      description: data.description || null,
      paymentMethod: data.paymentMethod || null,
      subtotal,
      discount,
      taxPercent: data.taxPercent || 0,
      taxAmount,
      totalAmount,
      paidAmount,
      balance,
      status,
      notes: data.notes || null,
      items: {
        create: items,
      },
    },
    include: {
      items: true,
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
    },
  })

  await prisma.notification.create({
    data: {
      type: 'INVOICE',
      title: 'Invoice generated',
      message: `Invoice ${invoice.invoiceNumber} created for ${invoice.patient.name}`,
      metadata: JSON.stringify({ link: `/billing/invoices/${invoice.id}` }),
    },
  })

  if (paidAmount > 0) {
    const paymentNumber = generateId('PAY')
    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        patientId: data.patientId,
        appointmentId: data.appointmentId || null,
        invoiceId: invoice.id,
        amount: paidAmount,
        paymentMethod: data.paymentMethod || 'CASH',
        status: 'COMPLETED',
      },
    })

    const account = await getCashOrBankAccount(data.paymentMethod || 'CASH')

    if (account) {
      const lastTxn = await prisma.ledgerTransaction.findFirst({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
      })
      const previousBalance = lastTxn?.balance || 0
      await prisma.ledgerTransaction.create({
        data: {
          transactionNumber: generateId('TXN'),
          date: new Date(),
          description: `Payment received from ${patient.name} - Invoice ${invoiceNumber}`,
          debitAmount: paidAmount,
          creditAmount: 0,
          balance: previousBalance + paidAmount,
          accountId: account.id,
          category: 'CONSULTATION_INCOME',
          patientId: data.patientId,
          appointmentId: data.appointmentId || null,
          invoiceId: invoice.id,
          paymentId: payment.id,
          userId: auth.userId,
        },
      })
    }

    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { paymentStatus: 'PAID' },
      })
    }

    await writeAuditLog({
      userId: auth.userId,
      action: 'CREATE',
      module: 'payments',
      recordId: payment.id,
      newValues: { paymentNumber, amount: paidAmount, invoiceId: invoice.id },
    })
  }

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'invoices',
    recordId: invoice.id,
    newValues: { invoiceNumber, totalAmount, status },
  })

  const fullInvoice = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      items: true,
      patient: { select: { id: true, name: true, phone: true, patientId: true } },
      payments: true,
      encounter: {
        select: {
          id: true,
          encounterDate: true,
          chiefComplaint: true,
          doctor: { select: { id: true, name: true } },
        },
      },
      appointment: {
        select: {
          id: true,
          appointmentNumber: true,
          appointmentDate: true,
          doctor: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json(fullInvoice, { status: 201 })
}
