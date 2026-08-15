import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { userSchema } from '@/lib/validators'
import { writeAuditLog } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'users', 'view')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { passwordHash, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'users', 'edit')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = userSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { password, ...fields } = parsed.data
    const updateData: Record<string, unknown> = {}

    if (fields.name !== undefined) updateData.name = fields.name
    if (fields.email !== undefined) updateData.email = fields.email
    if (fields.username !== undefined) updateData.username = fields.username
    if (fields.phone !== undefined) updateData.phone = fields.phone
    if (fields.roleId !== undefined) updateData.roleId = fields.roleId || null
    if (fields.status !== undefined) updateData.status = fields.status
    if (password && password.length >= 6) {
      updateData.passwordHash = await hashPassword(password)
    }

    if (updateData.email || updateData.username) {
      const conflict = await prisma.user.findFirst({
        where: {
          OR: [
            ...(updateData.email ? [{ email: updateData.email as string }] : []),
            ...(updateData.username ? [{ username: updateData.username as string }] : []),
          ],
          NOT: { id },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Email or username already taken' },
          { status: 409 }
        )
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    })

    const { passwordHash, ...safeUser } = user

    await writeAuditLog({
      userId: auth.userId,
      action: 'UPDATE',
      module: 'users',
      recordId: id,
      newValues: updateData,
    })

    return NextResponse.json({ success: true, data: safeUser })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, 'users', 'delete')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (auth.userId === id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    await writeAuditLog({
      userId: auth.userId,
      action: 'DELETE',
      module: 'users',
      recordId: id,
      previousValues: { email: user.email, name: user.name },
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
