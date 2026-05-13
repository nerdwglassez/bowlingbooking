'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInAction, type SignInActionResult } from './actions'

export interface SignInFormProps {
  from: string
}

const initialState: SignInActionResult = { ok: false }

export function SignInForm({ from }: SignInFormProps) {
  const [state, formAction] = useActionState(signInAction, initialState)
  const errored = state.error != null

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="from" value={from} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Email</span>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          inputSize="md"
          required
          invalid={errored}
          aria-invalid={errored || undefined}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Password</span>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          inputSize="md"
          required
          invalid={errored}
          aria-invalid={errored || undefined}
        />
      </label>

      {errored ? (
        <p
          role="alert"
          className="text-sm text-[var(--status-error-text)]"
        >
          Email or password is incorrect. Try again.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" size="md" loading={pending}>
      Sign in
    </Button>
  )
}
