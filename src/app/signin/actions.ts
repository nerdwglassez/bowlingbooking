'use server'

// actions.ts — Server actions for the /signin page.
//
// signInAction is the only entry point for credential-based sign-in. It calls
// NextAuth's signIn() and returns a structured error to the client when the
// credentials are wrong. A successful sign-in throws the framework redirect
// signal (NEXT_REDIRECT) — we re-throw it so Next can complete the navigation.

import { unstable_rethrow } from 'next/navigation'

import { AuthError, signIn, signOut, verifyCredentials } from '@/lib/auth'
import { sanitizeSignInFrom } from '@/lib/auth-paths'
import { getPostSignInPath } from '@/lib/post-sign-in'
import { hasAuthSecret } from '@/lib/env'
import { validateSignInCredentials } from '@/lib/sign-in-credentials'

export interface SignInActionResult {
  ok: boolean
  redirectTo?: string
  error?: 'invalid-credentials' | 'misconfigured' | 'unknown'
}

export async function signInAction(
  _prev: SignInActionResult | undefined,
  formData: FormData,
): Promise<SignInActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const fromRaw = formData.get('from')
  const from = sanitizeSignInFrom(
    typeof fromRaw === 'string' ? fromRaw : undefined,
  )
  const rememberDevice = formData.get('rememberDevice') === 'on'

  if (!validateSignInCredentials(email, password)) {
    return { ok: false, error: 'invalid-credentials' }
  }

  if (process.env.NODE_ENV === 'production' && !hasAuthSecret()) {
    return { ok: false, error: 'misconfigured' }
  }

  const verified = await verifyCredentials(email, password)
  if (!verified) {
    return { ok: false, error: 'invalid-credentials' }
  }

  const redirectTo = await getPostSignInPath(from, verified)

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
      redirectTo,
      rememberDevice: rememberDevice ? 'true' : 'false',
    })
    return { ok: true, redirectTo }
  } catch (err) {
    unstable_rethrow(err)
    if (err instanceof AuthError) {
      return { ok: false, error: 'invalid-credentials' }
    }
    console.error('[signInAction]', err)
    return { ok: false, error: 'unknown' }
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
