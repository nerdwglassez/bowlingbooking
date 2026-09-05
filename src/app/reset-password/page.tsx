import { SignInThemeScope } from '@/components/chrome/sign-in-theme-scope'

import { InvalidResetLink } from './invalid-reset-link'
import { ResetPasswordForm } from './reset-password-form'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''

  return (
    <SignInThemeScope>
      {token ? <ResetPasswordForm token={token} /> : <InvalidResetLink />}
    </SignInThemeScope>
  )
}
