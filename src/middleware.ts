import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"]

const staticPrefixes = ["/_next", "/favicon.ico", "/public"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (staticPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }

  let token = request.cookies.get("clinic-auth-token")?.value

  if (!token) {
    const authHeader = request.headers.get("authorization")
    const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)
    if (bearer) token = bearer[1]
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const { verifyToken } = await import("@/lib/auth")
    const payload = await verifyToken(token)

    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("clinic-auth-token")
      return response
    }

    const headers = new Headers(request.headers)
    headers.set("x-user-id", payload.userId)
    headers.set("x-user-email", payload.email)
    if (payload.role) {
      headers.set("x-user-role", payload.role)
    }

    return NextResponse.next({ request: { headers } })
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
