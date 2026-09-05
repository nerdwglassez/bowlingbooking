'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'
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
  const [rememberDevice, setRememberDevice] = useState(false)
  const errored = state.error != null
  const canSubmit = isSignInSubmitEnabled(email, password)

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.replace(state.redirectTo)
    }
  }, [state.ok, state.redirectTo, router])

  return (
    <form action={formAction} className="flex w-full flex-col gap-6" noValidate>
      <input type="hidden" name="from" value={from} />
      <input
        type="hidden"
        name="rememberDevice"
        value={rememberDevice ? 'on' : ''}
      />

      <div className="flex flex-col gap-5">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={setEmail}
          autoComplete="username email"
          inputMode="email"
          maxLength={SIGN_IN_EMAIL_MAX_LENGTH}
          size="md"
          isRequired
          hideRequiredIndicator
          isInvalid={errored}
        />
        <Input
          name="password"
          type="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          maxLength={SIGN_IN_PASSWORD_MAX_LENGTH}
          minLength={SIGN_IN_PASSWORD_MIN_LENGTH}
          size="md"
          isRequired
          hideRequiredIndicator
          isInvalid={errored}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Checkbox
          isSelected={rememberDevice}
          onChange={setRememberDevice}
          label="Remember for 30 days"
          size="sm"
        />
        <Button
          href={`/forgot-password?from=${encodeURIComponent(from)}`}
          color="link-color"
          size="sm"
        >
          Forgot password
        </Button>
      </div>

      {state.error === 'misconfigured' ? (
        <p role="alert" className="text-sm text-error-primary">
          Sign-in is not configured on this deployment. Set{' '}
          <strong>AUTH_SECRET</strong> and <strong>AUTH_URL</strong> in Vercel
          (use your live site URL, not localhost), then redeploy.
        </p>
      ) : null}
      {state.error === 'invalid-credentials' ? (
        <p role="alert" className="text-sm text-error-primary">
          Email or password is incorrect. Try again.
        </p>
      ) : null}
      {state.error === 'unknown' ? (
        <p role="alert" className="text-sm text-error-primary">
          Sign-in failed unexpectedly. Check Vercel env vars and redeploy.
        </p>
      ) : null}

      <SubmitButton isDisabled={!canSubmit} />
    </form>
  )
}

function SubmitButton({ isDisabled }: { isDisabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      color="primary"
      size="lg"
      className="w-full"
      isLoading={pending}
      isDisabled={isDisabled || pending}
      showTextWhileLoading
    >
      Sign in
    </Button>
  )
}
