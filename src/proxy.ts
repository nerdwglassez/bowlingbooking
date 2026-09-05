// proxy.ts — Next 16 file convention (renamed from `middleware` in Next 16).
//
// Injects request metadata so server layouts can render theme-aware markup
// without a client-side script.
//
// The root layout reads `x-pathname` to decide between light and dark themes
// (customer paths stay light; staff/admin use the theme cookie written from
// the device color scheme). Without this header, `headers()` in a
// Server Component can't see the current URL.

import { NextResponse, type NextRequest } from 'next/server'

import { isRateLimitEnabled } from '@/lib/env'
import { getHomeRedirectPath } from '@/lib/env.home-entry'
import {
  checkRateLimit,
  getClientIdFromHeaderValues,
  rateLimitBucketForPathname,
} from '@/lib/rate-limit'

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === '/') {
    const target = getHomeRedirectPath()
    if (target !== '/') {
      return NextResponse.redirect(new URL(target, request.url))
    }
  }

  if (isRateLimitEnabled()) {
    const bucket = rateLimitBucketForPathname(pathname)
    if (bucket) {
      const clientId = getClientIdFromHeaderValues((name) =>
        request.headers.get(name),
      )
      const result = checkRateLimit(bucket, clientId)
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': String(result.retryAfterSec),
            },
          },
        )
      }
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    // Match everything except Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff2?)$).*)',
  ],
}
