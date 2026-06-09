import Link from 'next/link'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { getTenant } from '@/lib/tenant'

import { ResetPasswordForm } from '../signin/auth-forms'

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''
  const tenant = await getTenant()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl">{tenant.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Choose a new password
        </p>
      </header>
      <Card variant="default">
        <CardHeader>
          <h2 className="text-lg">Reset password</h2>
        </CardHeader>
        <CardBody>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-[var(--status-error-text)]">
              This reset link is invalid.{' '}
              <Link href="/forgot-password" className="text-[var(--color-action)]">
                Request a new one
              </Link>
              .
            </p>
          )}
        </CardBody>
      </Card>
    </main>
  )
}
