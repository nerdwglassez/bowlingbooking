'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { PasswordField } from '@/components/patterns/password-field'
import {
  isSignInSubmitEnabled,
  SIGN_IN_EMAIL_MAX_LENGTH,
  SIGN_IN_PASSWORD_MAX_LENGTH,
  SIGN_IN_PASSWORD_MIN_LENGTH,
} from '@/lib/sign-in-credentials'

import { signInAction, type SignInActionResult } from './actions'

export interface SignInFormProps {
  from: string
}

const initialState: SignInActionResult = { ok: false }

export function SignInForm({ from }: SignInFormProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(signInAction, initialState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const errored = state.error != null
  const canSubmit = isSignInSubmitEnabled(email, password)

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.replace(state.redirectTo)
    }
  }, [state.ok, state.redirectTo, router])

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="from" value={from} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Email</span>
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={SIGN_IN_EMAIL_MAX_LENGTH}
          inputSize="md"
          required
          invalid={errored}
          aria-invalid={errored || undefined}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Password</span>
        <PasswordField
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          visible={passwordVisible}
          onToggleVisible={() => setPasswordVisible((current) => !current)}
          autoComplete="current-password"
          maxLength={SIGN_IN_PASSWORD_MAX_LENGTH}
          minLength={SIGN_IN_PASSWORD_MIN_LENGTH}
          inputSize="md"
          required
          invalid={errored}
          aria-invalid={errored || undefined}
        />
      </label>

      <Checkbox
        name="rememberDevice"
        label="Remember this device (30 days)"
        className="w-full"
      />

      {state.error === 'misconfigured' ? (
        <p role="alert" className="text-sm text-[var(--status-error-text)]">
          Sign-in is not configured on this deployment. Set{' '}
          <strong>AUTH_SECRET</strong> and <strong>AUTH_URL</strong> in Vercel
          (use your live site URL, not localhost), then redeploy.
        </p>
      ) : null}
      {state.error === 'invalid-credentials' ? (
        <p role="alert" className="text-sm text-[var(--status-error-text)]">
          Email or password is incorrect. Try again.
        </p>
      ) : null}
      {state.error === 'unknown' ? (
        <p role="alert" className="text-sm text-[var(--status-error-text)]">
          Sign-in failed unexpectedly. Check Vercel env vars and redeploy.
        </p>
      ) : null}

      <SubmitButton disabled={!canSubmit} />

      <Link
        href={`/forgot-password?from=${encodeURIComponent(from)}`}
        className="block w-full text-center text-sm font-medium text-[var(--color-action)]"
      >
        Forgot password?
      </Link>
    </form>
  )
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="primary"
      size="md"
      loading={pending}
      disabled={disabled || pending}
    >
      Sign in
    </Button>
  )
}
