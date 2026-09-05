import { redirect } from 'next/navigation'

import { SignInThemeScope } from '@/components/chrome/sign-in-theme-scope'
import { SignInScreen } from '@/components/patterns/sign-in-screen'
import { getCurrentUser } from '@/lib/auth'
import { getPostSignInPath } from '@/lib/post-sign-in'
import { sanitizeSignInFrom } from '@/lib/auth-paths'
import { getTenant } from '@/lib/tenant'
import { SignInForm } from './sign-in-form'

export const dynamic = 'force-dynamic'

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
    <SignInThemeScope>
      <SignInScreen venueName={tenant.name} year={new Date().getFullYear()}>
        <SignInForm from={from} />
      </SignInScreen>
    </SignInThemeScope>
  )
}
