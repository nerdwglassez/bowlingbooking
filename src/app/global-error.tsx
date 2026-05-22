// global-error.tsx — App Router catch-all for unhandled client React errors.
// Sentry captures the error before rendering the fallback. This file lives at
// `app/global-error.tsx` (or `src/app/global-error.tsx`) per Next.js convention
// and exists ONLY because Sentry's setup requires it; the rest of the app
// renders its own segment-level `error.tsx` files where appropriate.

'use client'

import { useEffect } from 'react'

import { captureException } from '@/lib/observability'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    captureException(error, { action: 'global-error' })
  }, [error])

  return (
    <html>
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          maxWidth: '32rem',
          margin: '0 auto',
        }}
      >
        <h1>Something went wrong.</h1>
        <p>
          We&apos;ve been notified. Try refreshing the page, or contact the
          venue if the problem continues.
        </p>
      </body>
    </html>
  )
}
