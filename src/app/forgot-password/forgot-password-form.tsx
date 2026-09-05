'use client'

import { useState, useTransition } from 'react'
import { Key01, Mail01 } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { PasswordResetScreen } from '@/components/patterns/password-reset-screen'
import { requestPasswordResetAction } from '@/lib/actions/password-reset'
import { SIGN_IN_EMAIL_MAX_LENGTH } from '@/lib/sign-in-credentials'

export function ForgotPasswordForm({ from }: { from: string }) {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const signInHref = `/signin?from=${encodeURIComponent(from)}`

  function requestReset(nextEmail: string) {
    setError(null)
    startTransition(async () => {
      try {
        await requestPasswordResetAction(nextEmail)
        setSubmittedEmail(nextEmail.trim().toLowerCase())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not send reset email.',
        )
      }
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    requestReset(email)
  }

  if (submittedEmail) {
    return (
      <PasswordResetScreen
        icon={Mail01}
        title="Check your email"
        description={
          <p>
            We sent a password reset link to{' '}
            <span className="font-medium">{submittedEmail}</span>
          </p>
        }
        signInHref={signInHref}
      >
        <div className="flex w-full flex-col items-center gap-6">
          <Button href="mailto:" color="primary" size="lg" className="w-full">
            Open email app
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-1 text-sm text-tertiary">
            <span>Didn&apos;t receive the email?</span>
            <Button
              type="button"
              color="link-color"
              size="sm"
              isDisabled={pending}
              onClick={() => requestReset(submittedEmail)}
            >
              Click to resend
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-error-primary">
              {error}
            </p>
          ) : null}
        </div>
      </PasswordResetScreen>
    )
  }

  return (
    <PasswordResetScreen
      icon={Key01}
      title="Forgot password?"
      description="No worries, we'll send you reset instructions."
      signInHref={signInHref}
    >
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          inputMode="email"
          maxLength={SIGN_IN_EMAIL_MAX_LENGTH}
          size="md"
          isRequired
          hideRequiredIndicator
          isInvalid={error != null}
        />
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
          isDisabled={!email.includes('@') || pending}
          showTextWhileLoading
        >
          Reset password
        </Button>
      </form>
    </PasswordResetScreen>
  )
}
