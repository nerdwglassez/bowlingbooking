'use client'

// TeamEditor — client island wrapping <UserForm> for create + edit. The
// edit mode also renders an inline "Reset password" + "Deactivate" panel.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  UserForm,
  type TeamRole,
  type UserFormValues,
} from '@/components/patterns/user-form'
import type { AdminUserRow } from '@/lib/actions/admin'
import {
  createTeamUserAction,
  deactivateTeamUserAction,
  resetUserPasswordAction,
  updateTeamUserAction,
} from '@/lib/actions/admin'
import { resendTeamInviteAction } from '@/lib/actions/team-invite'

interface TeamEditorProps {
  mode: 'create' | 'edit'
  tenantId: string
  callerRole: 'MANAGER' | 'ADMIN'
  callerId: string
  initial?: AdminUserRow
}

function defaultValues(initial?: AdminUserRow): UserFormValues {
  return {
    email: initial?.email ?? '',
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    role: (initial?.role as TeamRole) ?? 'STAFF',
    personalMessage: '',
  }
}

export function TeamEditor({
  mode,
  tenantId,
  callerRole,
  callerId,
  initial,
}: TeamEditorProps) {
  const router = useRouter()
  const [values, setValues] = useState<UserFormValues>(() =>
    defaultValues(initial),
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  // Reset-password sub-form state (edit mode only).
  const [resetPw, setResetPw] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetting, startReset] = useTransition()

  const [deactivating, startDeactivate] = useTransition()
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const [resending, startResend] = useTransition()

  const canAssignAdmin = callerRole === 'ADMIN'
  const isSelf = initial?.id === callerId

  function handleSubmit() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createTeamUserAction({
            tenantId,
            email: values.email,
            name: values.name || undefined,
            phone: values.phone || undefined,
            role: values.role,
            personalMessage: values.personalMessage.trim() || undefined,
          })
          router.push(`/admin/team/${result.userId}`)
          return
        }
        if (!initial) throw new Error('Missing user id for edit.')
        await updateTeamUserAction({
          userId: initial.id,
          name: values.name || null,
          phone: values.phone || null,
          role: values.role,
        })
        setSuccess('Team member saved.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save.')
      }
    })
  }

  function handleReset() {
    if (!initial) return
    setResetError(null)
    setResetSuccess(null)
    startReset(async () => {
      try {
        await resetUserPasswordAction({
          userId: initial.id,
          newPassword: resetPw,
        })
        setResetPw('')
        setResetSuccess(
          'Password reset. Share the new password with the team member out of band.',
        )
        router.refresh()
      } catch (err) {
        setResetError(
          err instanceof Error ? err.message : 'Could not reset password.',
        )
      }
    })
  }

  function handleDeactivate() {
    if (!initial) return
    setError(null)
    startDeactivate(async () => {
      try {
        await deactivateTeamUserAction(initial.id)
        router.push('/admin/team')
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not deactivate user.',
        )
      }
    })
  }

  function handleResendInvite() {
    if (!initial) return
    setResendSuccess(null)
    startResend(async () => {
      try {
        await resendTeamInviteAction({ userId: initial.id })
        setResendSuccess('Invite resent.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resend invite.')
      }
    })
  }

  const resetPanel =
    mode === 'edit' && initial ? (
      initial.hasPassword ? (
        <Card>
          <CardBody className="flex flex-col gap-3 text-sm">
            <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              Reset password
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Sets a new password for this team member. Tell them out of band.
            </p>
            <label className="flex flex-col gap-1">
              <Input
                type="text"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                minLength={8}
                placeholder="New password (8+ chars)"
              />
            </label>
            {resetError ? (
              <p className="text-[var(--status-error-text)]">{resetError}</p>
            ) : null}
            {resetSuccess ? (
              <p className="text-[var(--status-ok-text)]">{resetSuccess}</p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                loading={resetting}
                onClick={handleReset}
                disabled={resetPw.length < 8}
              >
                Reset password
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="flex flex-col gap-3 text-sm">
            <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              Pending invitation
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              This team member has not accepted their invite yet.
            </p>
            {resendSuccess ? (
              <p className="text-[var(--status-ok-text)]">{resendSuccess}</p>
            ) : null}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                loading={resending}
                onClick={handleResendInvite}
              >
                Resend invite
              </Button>
            </div>
          </CardBody>
        </Card>
      )
    ) : null

  return (
    <>
      <UserForm
        mode={mode}
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        canAssignAdmin={canAssignAdmin}
        submitting={submitting}
        error={error}
        successMessage={success}
        resetPanel={resetPanel}
      />
      {mode === 'edit' && initial && !isSelf ? (
        <Card>
          <CardBody className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">
                Deactivate team member
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                Removes sign-in access. Booking history is preserved.
              </span>
            </div>
            <Button
              variant="danger"
              loading={deactivating}
              onClick={handleDeactivate}
            >
              Deactivate
            </Button>
          </CardBody>
        </Card>
      ) : null}
    </>
  )
}
