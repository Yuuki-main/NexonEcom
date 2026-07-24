// middleware.js (project root, same level as package.json)
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

// Routes that require authentication
// Any path matching these patterns will be blocked for logged-out users
const PROTECTED_ROUTES = [
  /^\/account(\/.*)?$/, // /account and all sub-paths
  /^\/checkout(\/.*)?$/, // /checkout and all sub-paths
  /^\/products\/[^/]+$/, // /products/[slug] — detail pages only, not /products list
]

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_ROUTES.some((pattern) => pattern.test(pathname))

  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get('token')?.value

  if (!token) {
    return redirectToLogin(req)
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next() // token valid — let request through
  } catch {
    // Token exists but is invalid or expired
    return redirectToLogin(req)
  }
}

function redirectToLogin(req) {
  const loginUrl = new URL('/login', req.url)
  // Save where they were trying to go so login can redirect back after success
  loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Only run middleware on these paths — keeps it fast by skipping API routes,
  // static files, and _next internals
  matcher: ['/account/:path*', '/checkout/:path*', '/products/:path*'],
}
