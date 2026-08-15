import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'users', 'edit')
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })
  }

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : role.name
  const description = typeof body.description === 'string' ? body.description : role.description

  if (role.name === 'Super Admin' && name !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'The Super Admin role cannot be renamed' },
      { status: 400 }
    )
  }
  const permissionIds: string[] = Array.isArray(body.permissionIds)
    ? body.permissionIds.filter((pid: unknown): pid is string => typeof pid === 'string')
    : null

  if (!name) {
    return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 })
  }

  const duplicate = await prisma.role.findFirst({ where: { name, id: { not: id } } })
  if (duplicate) {
    return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id },
      data: { name, description },
    })

    if (permissionIds !== null) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      if (permissionIds.length > 0) {
        const valid = await tx.permission.findMany({ where: { id: { in: permissionIds } }, select: { id: true } })
        await tx.rolePermission.createMany({
          data: valid.map((p) => ({ roleId: id, permissionId: p.id })),
        })
      }
    }

    return tx.role.findUniqueOrThrow({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    })
  })

  const { permissions, ...safe } = updated

  await writeAuditLog({
    userId: auth.userId,
    action: 'UPDATE',
    module: 'users',
    recordId: id,
    newValues: { name, description, permissionIds },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...safe,
      permissions: permissions.map((p) => p.permission),
      userCount: updated._count.users,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'users', 'delete')
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 })
  }

  if (role.name === 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'The Super Admin role cannot be deleted' },
      { status: 400 }
    )
  }

  const userCount = await prisma.user.count({ where: { roleId: id } })
  if (userCount > 0) {
    return NextResponse.json(
      { success: false, error: `Cannot delete role: ${userCount} user(s) are assigned to it` },
      { status: 400 }
    )
  }

  await prisma.role.delete({ where: { id } })

  await writeAuditLog({
    userId: auth.userId,
    action: 'DELETE',
    module: 'users',
    recordId: id,
    previousValues: { name: role.name },
  })

  return NextResponse.json({ success: true, data: { id } })
}