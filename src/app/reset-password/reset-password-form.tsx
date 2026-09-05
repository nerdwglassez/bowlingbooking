'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Lock01 } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { PasswordResetScreen } from '@/components/patterns/password-reset-screen'
import { resetPasswordAction } from '@/lib/actions/password-reset'
import {
  isResetPasswordValid,
  passwordHasMinLength,
  passwordHasSpecialCharacter,
} from '@/lib/password-rules'
import { cx } from '@/utils/cx'

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  const canSubmit =
    isResetPasswordValid(password) && password === confirm && !pending

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!isResetPasswordValid(password)) {
      setError('Password does not meet the requirements.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await resetPasswordAction({ token, password })
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reset password.')
      }
    })
  }

  if (done) {
    return (
      <PasswordResetScreen
        icon={CheckCircle}
        title="Password reset"
        description="Your password has been successfully reset. Click below to log in."
        signInHref="/signin"
      >
        <Button href="/signin" color="primary" size="lg" className="w-full">
          Continue
        </Button>
      </PasswordResetScreen>
    )
  }

  return (
    <PasswordResetScreen
      icon={Lock01}
      title="Set new password"
      description="Your new password must be different to previously used passwords."
      signInHref="/signin"
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-5">
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            size="md"
            isRequired
            hideRequiredIndicator
            isInvalid={error != null}
          />
          <Input
            name="confirm"
            type="password"
            label="Confirm password"
            placeholder="••••••••••••"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            size="md"
            isRequired
            hideRequiredIndicator
            isInvalid={error != null}
          />
          <ul className="flex flex-col gap-3">
            <PasswordRule
              met={passwordHasMinLength(password)}
              label="Must be at least 8 characters"
            />
            <PasswordRule
              met={passwordHasSpecialCharacter(password)}
              label="Must contain one special character"
            />
          </ul>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-error-primary">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          color="primary"
          size="lg"
          className="w-full"
          isLoading={pending}
          isDisabled={!canSubmit}
          showTextWhileLoading
        >
          Reset password
        </Button>
      </form>
    </PasswordResetScreen>
  )
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle
        className={cx(
          'size-5 shrink-0',
          met ? 'text-fg-success-primary' : 'text-fg-quaternary',
        )}
        aria-hidden
      />
      <span className="text-sm text-tertiary">{label}</span>
    </li>
  )
}
