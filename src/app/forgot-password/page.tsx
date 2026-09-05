import { SignInThemeScope } from '@/components/chrome/sign-in-theme-scope'
import { sanitizeSignInFrom } from '@/lib/auth-paths'

import { ForgotPasswordForm } from './forgot-password-form'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ from?: string | string[] }>
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const fromRaw = typeof params.from === 'string' ? params.from : '/'
  const from = sanitizeSignInFrom(fromRaw)

  return (
    <SignInThemeScope>
      <ForgotPasswordForm from={from} />
    </SignInThemeScope>
  )
}
