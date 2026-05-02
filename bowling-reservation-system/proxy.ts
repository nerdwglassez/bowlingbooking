import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
])

const PUBLIC_PREFIX_ROUTES = ['/book', '/kiosk', '/waitlist/claim', '/api']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true
  return PUBLIC_PREFIX_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const { pathname } = request.nextUrl

  if (!sessionToken && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
