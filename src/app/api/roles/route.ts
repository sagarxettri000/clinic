import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'users', 'view')
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
        orderBy: { permission: { module: 'asc' } },
      },
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const data = roles.map(({ permissions, ...role }) => ({
    ...role,
    permissions: permissions.map((p) => p.permission),
    userCount: role._count.users,
  }))

  return NextResponse.json({ success: true, roles: data })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'users', 'create')
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description : null
  const permissionIds: string[] = Array.isArray(body.permissionIds)
    ? body.permissionIds.filter((id: unknown): id is string => typeof id === 'string')
    : []

  if (!name) {
    return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 })
  }

  const existing = await prisma.role.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 })
  }

  const validIds = permissionIds.length > 0
    ? (await prisma.permission.findMany({ where: { id: { in: permissionIds } }, select: { id: true } })).map((p) => p.id)
    : []

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.role.create({
      data: {
        name,
        description,
        permissions: {
          create: validIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    })
    return created
  })

  const { permissions, ...safe } = role

  await writeAuditLog({
    userId: auth.userId,
    action: 'CREATE',
    module: 'users',
    recordId: role.id,
    newValues: { name, description, permissionIds: validIds },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        ...safe,
        permissions: permissions.map((p) => p.permission),
        userCount: role._count.users,
      },
    },
    { status: 201 }
  )
}