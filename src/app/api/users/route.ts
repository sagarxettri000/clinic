import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { userSchema } from '@/lib/validators'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users', 'view')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { username: { contains: search } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    const safeUsers = users.map(({ passwordHash, ...rest }) => rest)

    return NextResponse.json({
      success: true,
      data: safeUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, 'users', 'create')
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = userSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { password, ...userData } = parsed.data

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: userData.email }, { username: userData.username }] },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User with this email or username already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        ...userData,
        roleId: userData.roleId || null,
        passwordHash,
      },
      include: { role: true },
    })

    const { passwordHash: _, ...safeUser } = user

    await writeAuditLog({
      userId: auth.userId,
      action: 'CREATE',
      module: 'users',
      recordId: user.id,
      newValues: { email: user.email, roleId: user.roleId },
    })

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
