'use client'

import { useEffect } from 'react'
import { unstable_rethrow } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { isNextRouterDigest, redirectUrlFromDigest } from '@/lib/router-errors'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const redirectTo = redirectUrlFromDigest(error.digest)

  useEffect(() => {
    if (redirectTo) {
      window.location.replace(redirectTo)
    }
  }, [redirectTo])

  unstable_rethrow(error)

  if (isNextRouterDigest(error.digest)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Redirecting…
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl">Something went wrong</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Try again. If you were signing in, confirm{' '}
        <strong>AUTH_SECRET</strong> and <strong>AUTH_URL</strong> on Vercel match
        your live domain, then redeploy.
      </p>
      <Button variant="primary" size="md" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  )
}
