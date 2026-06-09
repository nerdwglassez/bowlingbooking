'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestPasswordResetAction, resetPasswordAction } from '@/lib/actions/password-reset'
import { acceptTeamInviteAction } from '@/lib/actions/team-invite'
import { sanitizeSignInFrom } from '@/lib/auth-paths'

export function ForgotPasswordForm({ from }: { from: string }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await requestPasswordResetAction(email)
        setSubmitted(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not send reset email.',
        )
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-[var(--color-text-secondary)]">
          If an account exists for that email, we sent password reset
          instructions. Check your inbox.
        </p>
        <Button asChild variant="ghost">
          <Link href={`/signin?from=${encodeURIComponent(from)}`}>
            Back to sign in
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Email</span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <Button type="submit" variant="primary" loading={pending}>
        Send reset link
      </Button>
      <Button asChild variant="ghost">
        <Link href={`/signin?from=${encodeURIComponent(from)}`}>
          Back to sign in
        </Link>
      </Button>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
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
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-[var(--color-text-secondary)]">
          Your password has been updated. You can sign in now.
        </p>
        <Button asChild variant="primary">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">New password</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Confirm password</span>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <Button type="submit" variant="primary" loading={pending}>
        Update password
      </Button>
    </form>
  )
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await acceptTeamInviteAction({ token, password })
        setDone(true)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not accept invitation.',
        )
      }
    })
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-[var(--color-text-secondary)]">
          Your account is ready. Sign in with your email and the password you
          just set.
        </p>
        <Button asChild variant="primary">
          <Link href="/signin?from=/staff">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Password</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Confirm password</span>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <Button type="submit" variant="primary" loading={pending}>
        Set password and join
      </Button>
    </form>
  )
}

export function sanitizeFromParam(raw: string | undefined): string {
  return sanitizeSignInFrom(raw)
}
