import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', ts: Date.now() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
