import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { getPostSignInPath } from '@/lib/post-sign-in'
import { sanitizeSignInFrom } from '@/lib/auth-paths'
import { getTenant } from '@/lib/tenant'
import { SignInForm } from './sign-in-form'

function fromSearchParam(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string') return '/'
  return sanitizeSignInFrom(raw)
}

interface SignInPageProps {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const from = fromSearchParam(params.from)

  const user = await getCurrentUser()
  if (user) redirect(await getPostSignInPath(from, user))

  const tenant = await getTenant()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl">{tenant.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Sign in to continue
        </p>
      </header>

      <Card variant="default">
        <CardHeader>
          <h2 className="text-lg">Staff sign-in</h2>
        </CardHeader>
        <CardBody>
          <SignInForm from={from} />
        </CardBody>
      </Card>
    </main>
  )
}
