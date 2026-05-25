'use server'

// actions.ts — Server actions for the /signin page.
//
// signInAction is the only entry point for credential-based sign-in. It calls
// NextAuth's signIn() and returns a structured error to the client when the
// credentials are wrong. A successful sign-in throws the framework redirect
// signal (NEXT_REDIRECT) — we re-throw it so Next can complete the navigation.

import { unstable_rethrow } from 'next/navigation'

import { AuthError, signIn, signOut } from '@/lib/auth'
import { hasAuthSecret } from '@/lib/env'

export interface SignInActionResult {
  ok: boolean
  error?: 'invalid-credentials' | 'misconfigured' | 'unknown'
}

const ALLOWED_FROM_PATH = /^\/[A-Za-z0-9/_-]*$/

function safeRedirectTarget(from: FormDataEntryValue | null): string {
  if (typeof from !== 'string') return '/'
  if (!ALLOWED_FROM_PATH.test(from)) return '/'
  if (from === '/signin') return '/'
  return from
}

export async function signInAction(
  _prev: SignInActionResult | undefined,
  formData: FormData,
): Promise<SignInActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = safeRedirectTarget(formData.get('from'))

  if (!email || !password) {
    return { ok: false, error: 'invalid-credentials' }
  }

  if (process.env.NODE_ENV === 'production' && !hasAuthSecret()) {
    return { ok: false, error: 'misconfigured' }
  }

  try {
    await signIn('credentials', { email, password, redirectTo })
    return { ok: true }
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
