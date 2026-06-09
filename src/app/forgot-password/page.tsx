import Link from 'next/link'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { getTenant } from '@/lib/tenant'
import { sanitizeSignInFrom } from '@/lib/auth-paths'

import { ForgotPasswordForm } from '../signin/auth-forms'

type PageProps = {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const fromRaw = typeof params.from === 'string' ? params.from : '/'
  const from = sanitizeSignInFrom(fromRaw)
  const tenant = await getTenant()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl">{tenant.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Reset your password
        </p>
      </header>
      <Card variant="default">
        <CardHeader>
          <h2 className="text-lg">Forgot password</h2>
        </CardHeader>
        <CardBody>
          <ForgotPasswordForm from={from} />
        </CardBody>
      </Card>
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        <Link href={`/signin?from=${encodeURIComponent(from)}`}>
          Back to sign in
        </Link>
      </p>
    </main>
  )
}
