import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const rawJwtSecret = process.env.JWT_SECRET
if (!rawJwtSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required. Set a strong random secret before starting the server.'
  )
}
const JWT_SECRET = new TextEncoder().encode(rawJwtSecret)

interface TokenPayload {
  userId: string
  email: string
  role?: string
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string | undefined,
    }
  } catch {
    return null
  }
}

export async function getUserIdFromRequest(
  request: Request
): Promise<string | null> {
  let token: string | null = null

  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/clinic-auth-token=([^;]+)/)
  if (match) {
    token = match[1]
  }

  if (!token) {
    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearer) {
      token = bearer[1]
    }
  }

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.userId ?? null
}
