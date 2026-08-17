import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { revalidateTag } from 'next/cache'

export const revalidate = 60

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'encounters', 'view')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  const where: Record<string, unknown> = { isActive: 1 }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) where.category = category

  const services = await prisma.service.findMany({
    where,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return new Response(
    JSON.stringify({ services }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=15, stale-while-revalidate=15' } }
  )
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'encounters', 'create')
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Service name is required' }, { status: 400 })
  }

  const price = Number(body.price)
  if (Number.isNaN(price) || price < 0) {
    return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })
  }

  const existing = await prisma.service.findUnique({
    where: { name: body.name.trim() },
  })
  if (existing) {
    return NextResponse.json({ error: 'Service already exists' }, { status: 409 })
  }

  const service = await prisma.service.create({
    data: {
      name: body.name.trim(),
      category: body.category || null,
      price,
      isActive: body.isActive === 0 ? 0 : 1,
    },
  })

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'services',
    recordId: service.id,
    newValues: { name: service.name, price },
  })

  revalidateTag('services', 'max')

  return NextResponse.json(service, { status: 201 })
}