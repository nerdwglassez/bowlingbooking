import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/', '/book', '/terms', '/kiosk']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // If accessing protected route without session, redirect to login
  if (!sessionToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Staff routes
  if (request.nextUrl.pathname.startsWith('/staff')) {
    // We'll check role in the route handler since we need DB access
    // This just ensures they have a session
  }

  // Admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Same as above - role check in route handler
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
