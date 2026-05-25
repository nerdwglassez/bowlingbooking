import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'
import { SignInForm } from './sign-in-form'

const ALLOWED_FROM_PATH = /^\/[A-Za-z0-9/_-]*$/

function safeFrom(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string') return '/'
  if (!ALLOWED_FROM_PATH.test(raw)) return '/'
  if (raw === '/signin') return '/'
  return raw
}

interface SignInPageProps {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams
  const from = safeFrom(params.from)

  const user = await getCurrentUser()
  if (user) redirect(from)

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
