import Link from 'next/link'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { getTenant } from '@/lib/tenant'

import { AcceptInviteForm } from '../signin/auth-forms'

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''
  const tenant = await getTenant()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl">{tenant.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Set your password to join the team
        </p>
      </header>
      <Card variant="default">
        <CardHeader>
          <h2 className="text-lg">Accept invitation</h2>
        </CardHeader>
        <CardBody>
          {token ? (
            <AcceptInviteForm token={token} />
          ) : (
            <p className="text-sm text-[var(--status-error-text)]">
              This invite link is invalid. Ask your venue admin to resend the
              invitation.
            </p>
          )}
        </CardBody>
      </Card>
      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        Already have a password?{' '}
        <Link href="/signin?from=/staff" className="text-[var(--color-action)]">
          Sign in
        </Link>
      </p>
    </main>
  )
}
