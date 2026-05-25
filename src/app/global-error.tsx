'use client'

import { useEffect } from 'react'

import { captureException } from '@/lib/observability'
import { isNextRouterDigest, redirectUrlFromDigest } from '@/lib/router-errors'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  const redirectTo = redirectUrlFromDigest(error.digest)

  useEffect(() => {
    if (redirectTo) {
      window.location.replace(redirectTo)
      return
    }
    if (!isNextRouterDigest(error.digest)) {
      captureException(error, { action: 'global-error' })
    }
  }, [error, redirectTo])

  if (redirectTo || isNextRouterDigest(error.digest)) {
    return (
      <html lang="en">
        <body
          style={{
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            maxWidth: '32rem',
            margin: '0 auto',
          }}
        >
          <p>Redirecting…</p>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
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
        {error.digest ? (
          <p style={{ fontSize: '12px', opacity: 0.7 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  )
}
