import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import rateLimit from 'express-rate-limit'

// Rate limiters configured for this clinic app
// - Global API: 30 requests per 15 min per IP
// - Auth login: 5 attempts per 15 min per IP (more restrictive)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
})

// Next.js middleware function
export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url)

  // Apply auth limiter to login route
  if (pathname === '/api/auth/login') {
    return authLimiter(request, {}, (err: any) => {
      if (err) {
        return new Response(
          JSON.stringify({ success: false, error: 'Too many login attempts' }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      return NextResponse.next()
    })
  }

  // Apply global limiter to all other API routes
  if (pathname.startsWith('/api/')) {
    return globalLimiter(request, {}, (err: any) => {
      if (err) {
        return new Response(
          JSON.stringify({ success: false, error: 'Too many requests' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'RateLimit-Limit': String(globalLimiter.max),
              'RateLimit-Remaining': '0',
              'RateLimit-Reset': String(Math.floor(Date.now() / 900000 + 1) * 900000),
            },
          }
        )
      }
      return NextResponse.next()
    })
  }

  // No rate limiting for non-API routes
  return NextResponse.next()
}

// Webpack configuration for Next.js middleware
// This tells Next.js to run the middleware on these patterns
export const config = {
  matcher: ['/api/:path*', '/api/auth/login'],
}