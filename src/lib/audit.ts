import { prisma } from './db'

export async function writeAuditLog(input: {
  userId: string
  action: string
  module: string
  recordId?: string | null
  previousValues?: unknown
  newValues?: unknown
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        module: input.module,
        recordId: input.recordId || null,
        previousValues:
          input.previousValues === undefined
            ? null
            : JSON.stringify(input.previousValues),
        newValues:
          input.newValues === undefined ? null : JSON.stringify(input.newValues),
      },
    })
  } catch (error) {
    console.error('Audit log write failed:', error)
  }
}