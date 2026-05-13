// proxy.ts — Next 16 file convention (renamed from `middleware` in Next 16).
//
// Injects request metadata so server layouts can render theme-aware markup
// without a client-side script.
//
// The root layout reads `x-pathname` to decide between light and dark themes
// (staff and admin paths are always dark; customer paths default to light or
// respect the user's theme cookie). Without this header, `headers()` in a
// Server Component can't see the current URL.

import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

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
