import { prisma } from './db'

export const DEFAULT_ACCOUNT_CODES = {
  CASH: '1001',
  BANK: '1002',
  CONSULTATION_INCOME: '4001',
  EXPENSE: '5001',
} as const

export async function getAccountByCode(code: string) {
  return prisma.account.findUnique({ where: { code } })
}

export async function getCashOrBankAccount(
  paymentMethod: string
) {
  const code =
    paymentMethod === 'CASH' ? DEFAULT_ACCOUNT_CODES.CASH : DEFAULT_ACCOUNT_CODES.BANK
  return getAccountByCode(code)
}

export async function getNextAppointmentNumber(
  date: Date
): Promise<number> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const result = await prisma.appointment.aggregate({
    where: {
      appointmentDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    _max: {
      appointmentNumber: true,
    },
  })

  return (result._max.appointmentNumber ?? 0) + 1
}
