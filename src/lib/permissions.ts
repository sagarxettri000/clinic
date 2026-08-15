import { prisma } from '@/lib/db'
import { getUserIdFromRequest } from '@/lib/auth'

export interface AuthContext {
  userId: string
  roleName: string | null
  isSuperAdmin: boolean
  permissions: { module: string; action: string }[]
}

export async function getAuthContext(
  request: Request
): Promise<AuthContext | null> {
  const userId = await getUserIdFromRequest(request)
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  })

  if (!user || user.status !== 'ACTIVE') return null

  const permissions = (user.role?.permissions ?? []).map((rp) => ({
    module: rp.permission.module,
    action: rp.permission.action,
  }))

  return {
    userId: user.id,
    roleName: user.role?.name ?? null,
    isSuperAdmin: user.role?.name === 'Super Admin',
    permissions,
  }
}

export async function requirePermission(
  request: Request,
  module: string,
  action: string
): Promise<AuthContext | null> {
  const ctx = await getAuthContext(request)
  if (!ctx) return null
  if (ctx.isSuperAdmin) return ctx
  const allowed = ctx.permissions.some(
    (p) => p.module === module && p.action === action
  )
  return allowed ? ctx : null
}

export async function requireAnyRole(
  request: Request,
  roles: string[]
): Promise<AuthContext | null> {
  const ctx = await getAuthContext(request)
  if (!ctx) return null
  if (ctx.isSuperAdmin) return ctx
  return ctx.roleName && roles.includes(ctx.roleName) ? ctx : null
}