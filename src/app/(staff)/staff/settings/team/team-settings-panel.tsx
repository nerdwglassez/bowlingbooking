'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit01, Plus, UsersX } from '@untitledui/icons'

import { Table, TableCard } from '@/components/application/table/table'
import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Avatar } from '@/components/base/avatar/avatar'
import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import type { AdminUserRow } from '@/lib/actions/admin'
import {
  createTeamUserAction,
  deactivateTeamUserAction,
  resetUserPasswordAction,
  updateTeamUserAction,
} from '@/lib/actions/admin'
import { resendTeamInviteAction } from '@/lib/actions/team-invite'

type CallerRole = 'MANAGER' | 'ADMIN'
type TeamRole = 'STAFF' | 'MANAGER' | 'ADMIN'

type InviteDeliveryResult = {
  inviteUrl?: string
  emailError?: string
}

type InviteLinkFallbackState = {
  inviteUrl: string
  emailError?: string
} | null

const ROLE_COLOR: Record<TeamRole, 'gray' | 'brand' | 'success'> = {
  STAFF: 'gray',
  MANAGER: 'brand',
  ADMIN: 'success',
}

function memberInitials(name: string | null, email: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

function formatInvitedAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Invited just now'
  if (mins < 60) return `Invited ${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `Invited ${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `Invited ${days}d ago`
}

function canEditTeamMember(callerRole: CallerRole, target: AdminUserRow): boolean {
  return !(callerRole === 'MANAGER' && target.role === 'ADMIN')
}

function canRemoveTeamMember(
  callerRole: CallerRole,
  target: AdminUserRow,
  callerId: string,
): boolean {
  if (target.id === callerId) return false
  if (target.role === 'ADMIN' && callerRole !== 'ADMIN') return false
  return true
}

function canResetTeamPassword(
  callerRole: CallerRole,
  target: AdminUserRow,
  callerId: string,
): boolean {
  if (target.id === callerId) return false
  return canEditTeamMember(callerRole, target)
}

export function TeamSettingsPanel({
  tenantId,
  users,
  callerRole,
  callerId,
  initialMemberId,
}: {
  tenantId: string
  users: AdminUserRow[]
  callerRole: CallerRole
  callerId: string
  initialMemberId?: string
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(
    () =>
      (initialMemberId
        ? users.find((u) => u.id === initialMemberId)
        : null) ?? null,
  )
  // React to a changed deep-link member (?member=…) without an effect.
  const [lastInitialMemberId, setLastInitialMemberId] =
    useState(initialMemberId)
  const [inviteLinkFallback, setInviteLinkFallback] =
    useState<InviteLinkFallbackState>(null)

  if (initialMemberId !== lastInitialMemberId) {
    setLastInitialMemberId(initialMemberId)
    const match = initialMemberId
      ? users.find((u) => u.id === initialMemberId)
      : null
    if (match) setDetailUser(match)
  }

  function handleInviteDeliveryResult(
    result: InviteDeliveryResult,
    closeDetail: boolean,
  ) {
    if (result.inviteUrl) {
      if (closeDetail) setDetailUser(null)
      setInviteLinkFallback({
        inviteUrl: result.inviteUrl,
        emailError: result.emailError,
      })
      showToast({
        message: result.emailError
          ? 'Could not send invite email — copy the link below.'
          : 'Copy the invite link below to share manually.',
        variant: result.emailError ? 'error' : 'success',
      })
      return
    }
    showToast({ message: 'Invite email sent', variant: 'success' })
  }

  return (
    <>
      <TableCard.Root>
        <TableCard.Header
          title="Team members"
          badge={`${users.length} ${users.length === 1 ? 'user' : 'users'}`}
          description="Invite staff, assign roles, and manage access."
          contentTrailing={
            <Button type="button" size="sm" iconLeading={Plus} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          }
        />
        {users.length === 0 ? (
          <p className="px-4 py-8 text-sm text-tertiary md:px-6">
            No team members yet.
          </p>
        ) : (
          <Table aria-label="Team members" size="sm">
            <Table.Header>
              <Table.Head id="name" isRowHeader>
                Name
              </Table.Head>
              <Table.Head id="status">Status</Table.Head>
              <Table.Head id="email" className="hidden md:table-cell">
                Email address
              </Table.Head>
              <Table.Head id="role">Role</Table.Head>
              <Table.Head id="actions" className="w-16">
                <span className="sr-only">Actions</span>
              </Table.Head>
            </Table.Header>
            <Table.Body items={users}>
              {(u) => {
                const pending = !u.hasPassword
                return (
                  <Table.Row
                    id={u.id}
                    onAction={() => setDetailUser(u)}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          initials={memberInitials(u.name, u.email)}
                          alt={u.name ?? u.email}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">
                            {u.name ?? 'Unnamed'}
                          </p>
                          <p className="truncate text-xs text-tertiary md:hidden">
                            {u.email}
                          </p>
                          {pending ? (
                            <p className="text-xs text-tertiary">
                              {formatInvitedAgo(new Date(u.createdAt))}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        size="sm"
                        type="pill-color"
                        color={pending ? 'warning' : 'success'}
                      >
                        {pending ? 'Pending' : 'Active'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="hidden md:table-cell">
                      {u.email}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        size="sm"
                        type="pill-color"
                        color={ROLE_COLOR[u.role as TeamRole]}
                      >
                        {u.role}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        type="button"
                        color="tertiary"
                        size="sm"
                        iconLeading={Edit01}
                        aria-label={`Edit ${u.name ?? u.email}`}
                        onClick={() => setDetailUser(u)}
                      />
                    </Table.Cell>
                  </Table.Row>
                )
              }}
            </Table.Body>
          </Table>
        )}
      </TableCard.Root>

      <InviteSheet
        open={inviteOpen}
        tenantId={tenantId}
        callerRole={callerRole}
        onClose={() => setInviteOpen(false)}
        onSuccess={(result) => {
          setInviteOpen(false)
          handleInviteDeliveryResult(result, false)
          router.refresh()
        }}
      />

      <DetailSheet
        open={detailUser != null}
        user={
          detailUser
            ? (users.find((u) => u.id === detailUser.id) ?? detailUser)
            : null
        }
        callerRole={callerRole}
        callerId={callerId}
        onClose={() => setDetailUser(null)}
        onSaved={() => {
          setDetailUser(null)
          showToast({ message: 'Team member updated', variant: 'success' })
          router.refresh()
        }}
        onResent={(result) => {
          handleInviteDeliveryResult(result, true)
          router.refresh()
        }}
        onPasswordReset={() => {
          showToast({ message: 'Password updated', variant: 'success' })
          router.refresh()
        }}
        onRemoved={() => {
          setDetailUser(null)
          showToast({ message: 'Team member removed', variant: 'success' })
          router.refresh()
        }}
      />

      <InviteLinkFallback
        state={inviteLinkFallback}
        onClose={() => setInviteLinkFallback(null)}
      />
    </>
  )
}

function InviteLinkFallback({
  state,
  onClose,
}: {
  state: InviteLinkFallbackState
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = state?.inviteUrl ?? null

  async function handleCopy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const message = state?.emailError
    ? `We could not send the invite email: ${state.emailError} Share this link with your team member directly — it expires in 48 hours.`
    : 'Email delivery is not configured (RESEND_API_KEY). Share this link with your team member directly — it expires in 48 hours.'

  return (
    <BottomSheet
      open={inviteUrl != null}
      title="Copy invite link"
      elevated
      onClose={onClose}
    >
      {inviteUrl ? (
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-tertiary">{message}</p>
          <Input type="url" value={inviteUrl} isReadOnly />
          <Button type="button" className="w-full" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy invite link'}
          </Button>
          <Button type="button" color="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  )
}

function InviteSheet({
  open,
  tenantId,
  callerRole,
  onClose,
  onSuccess,
}: {
  open: boolean
  tenantId: string
  callerRole: CallerRole
  onClose: () => void
  onSuccess: (result: InviteDeliveryResult) => void
}) {
  const [email, setEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [role, setRole] = useState<TeamRole>('STAFF')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createTeamUserAction({
          tenantId,
          email,
          role,
          name: undefined,
          phone: undefined,
          personalMessage: personalMessage.trim() || undefined,
        })
        setEmail('')
        setPersonalMessage('')
        setRole('STAFF')
        onSuccess({
          inviteUrl: result.inviteUrl,
          emailError: result.emailError,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not invite member.')
      }
    })
  }

  return (
    <BottomSheet open={open} title="Invite team member" onClose={onClose}>
      <form
        className="flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Email</span>
          <Input
            type="email"
            value={email}
            onChange={setEmail}
            isRequired
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Role</span>
          <NativeSelect
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            options={[
              { label: 'Staff', value: 'STAFF' },
              { label: 'Manager', value: 'MANAGER' },
              ...(callerRole === 'ADMIN'
                ? [{ label: 'Admin', value: 'ADMIN' }]
                : []),
            ]}
          />
          {callerRole === 'MANAGER' ? (
            <span className="text-xs text-tertiary">
              Managers can invite staff and other managers only.
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Personal message (optional)
          </span>
          <textarea
            rows={3}
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            className="w-full resize-none rounded-xl border border-secondary bg-primary px-3 py-2 text-sm text-primary"
            placeholder="Welcome to the team!"
          />
        </label>
        <p className="text-xs text-tertiary">
          An invite link will be sent to their email. The link expires in{' '}
          <strong>48 hours</strong>. They&apos;ll set their own password when
          they accept.
        </p>
        {error ? (
          <p className="text-sm text-error-primary">{error}</p>
        ) : null}
        <Button type="submit" className="w-full" isLoading={pending}>
          Send invite
        </Button>
      </form>
    </BottomSheet>
  )
}

function DetailSheet({
  open,
  user,
  callerRole,
  callerId,
  onClose,
  onSaved,
  onResent,
  onPasswordReset,
  onRemoved,
}: {
  open: boolean
  user: AdminUserRow | null
  callerRole: CallerRole
  callerId: string
  onClose: () => void
  onSaved: () => void
  onResent: (result: InviteDeliveryResult) => void
  onPasswordReset: () => void
  onRemoved: () => void
}) {
  return (
    <BottomSheet
      open={open && user != null}
      title={user?.name ?? user?.email ?? 'Team member'}
      onClose={onClose}
    >
      {user ? (
        <DetailSheetForm
          key={user.id}
          user={user}
          callerRole={callerRole}
          callerId={callerId}
          onSaved={onSaved}
          onResent={onResent}
          onPasswordReset={onPasswordReset}
          onRemoved={onRemoved}
        />
      ) : null}
    </BottomSheet>
  )
}

function DetailSheetForm({
  user,
  callerRole,
  callerId,
  onSaved,
  onResent,
  onPasswordReset,
  onRemoved,
}: {
  user: AdminUserRow
  callerRole: CallerRole
  callerId: string
  onSaved: () => void
  onResent: (result: InviteDeliveryResult) => void
  onPasswordReset: () => void
  onRemoved: () => void
}) {
  const [name, setName] = useState(user.name ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [role, setRole] = useState<TeamRole>(user.role as TeamRole)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resendPending, startResend] = useTransition()
  const [resetPending, startReset] = useTransition()
  const [removePending, startRemove] = useTransition()
  const pendingInvite = !user.hasPassword
  const editable = canEditTeamMember(callerRole, user)
  const removable = canRemoveTeamMember(callerRole, user, callerId)
  const resettable = canResetTeamPassword(callerRole, user, callerId)
  const passwordsMatch =
    newPassword.length >= 8 && newPassword === confirmPassword

  function handleSave() {
    if (!editable) return
    setError(null)
    startTransition(async () => {
      try {
        await updateTeamUserAction({
          userId: user.id,
          name,
          phone: phone.trim() || null,
          role,
        })
        onSaved()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update member.')
      }
    })
  }

  function handleResend() {
    if (!editable) return
    setError(null)
    startResend(async () => {
      try {
        const result = await resendTeamInviteAction({ userId: user.id })
        onResent({
          inviteUrl: result.inviteUrl,
          emailError: result.emailError,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not resend invite.')
      }
    })
  }

  function handleRemove() {
    if (!removable) return
    setError(null)
    startRemove(async () => {
      try {
        await deactivateTeamUserAction(user.id)
        onRemoved()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not remove member.')
      }
    })
  }

  function handleResetPassword() {
    if (!resettable || !passwordsMatch) return
    setPasswordError(null)
    startReset(async () => {
      try {
        await resetUserPasswordAction({
          userId: user.id,
          newPassword,
        })
        setNewPassword('')
        setConfirmPassword('')
        onPasswordReset()
      } catch (err) {
        setPasswordError(
          err instanceof Error ? err.message : 'Could not update password.',
        )
      }
    })
  }

  const displayName = user.name ?? user.email

  return (
    <div className="flex flex-col gap-3 p-4">
      {!editable ? (
        <p className="text-xs text-tertiary">
          Only an admin can edit admin accounts.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Email</span>
        <Input type="email" value={user.email} isDisabled />
      </label>

      {pendingInvite ? (
        <p className="text-xs text-tertiary">
          {formatInvitedAgo(new Date(user.createdAt))} — waiting for them to
          accept.
        </p>
      ) : (
        <p className="text-xs text-tertiary">
          {user.hasPassword ? 'Active account' : 'No password set'}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Name</span>
        <Input
          type="text"
          value={name}
          onChange={setName}
          isDisabled={!editable}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Phone</span>
        <Input
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="(555) 555-5555"
          isDisabled={!editable}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Role</span>
        <NativeSelect
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
          disabled={!editable}
          options={[
            { label: 'Staff', value: 'STAFF' },
            { label: 'Manager', value: 'MANAGER' },
            ...(callerRole === 'ADMIN'
              ? [{ label: 'Admin', value: 'ADMIN' }]
              : []),
          ]}
        />
        {callerRole === 'MANAGER' && user.role === 'ADMIN' ? (
          <span className="text-xs text-tertiary">
            Admin role cannot be changed by a manager.
          </span>
        ) : null}
      </label>

      {resettable ? (
        <div className="flex flex-col gap-2 rounded-xl border border-solid border-secondary bg-secondary p-4">
          <h3 className="text-xs uppercase tracking-wide text-tertiary">
            {pendingInvite ? 'Set password' : 'Reset password'}
          </h3>
          <p className="text-xs text-tertiary">
            {pendingInvite
              ? 'Set a sign-in password directly instead of waiting for the invite link.'
              : 'Sets a new sign-in password. Share it with them securely.'}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              New password
            </span>
            <Input
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Confirm password
            </span>
            <Input
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              minLength={8}
              autoComplete="new-password"
              placeholder="Re-enter password"
            />
          </label>
          {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
            <p className="text-xs text-error-primary">
              Passwords do not match.
            </p>
          ) : null}
          {passwordError ? (
            <p className="text-sm text-error-primary">
              {passwordError}
            </p>
          ) : null}
          <Button
            type="button"
            color="secondary"
            className="w-full"
            isLoading={resetPending}
            isDisabled={!passwordsMatch}
            onClick={handleResetPassword}
          >
            {pendingInvite ? 'Set password' : 'Update password'}
          </Button>
        </div>
      ) : user.id === callerId ? (
        <p className="text-xs text-tertiary">
          Change your own password from Profile.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}

      {removable ? (
        <div className="flex flex-col gap-2 rounded-xl border border-solid border-error bg-error-primary p-4">
          <h3 className="text-xs uppercase tracking-wide text-error-primary">
            Account actions
          </h3>
          {confirmRemove ? (
            <>
              <p className="text-sm text-tertiary">
                Remove {displayName} from the team? They will lose staff access
                immediately. This cannot be undone.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  color="primary-destructive"
                  className="w-full"
                  isLoading={removePending}
                  onClick={handleRemove}
                >
                  Remove from team
                </Button>
                <Button
                  type="button"
                  color="tertiary"
                  className="w-full"
                  isDisabled={removePending}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-solid border-error bg-primary px-3 py-3 text-left transition-colors hover:bg-secondary"
              onClick={() => setConfirmRemove(true)}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm text-primary">
                  Remove from team
                </span>
                <span className="text-xs text-tertiary">
                  Blocks sign-in · booking history preserved
                </span>
              </div>
              <UsersX
                className="size-4 shrink-0 text-error-primary"
                aria-hidden
              />
            </button>
          )}
        </div>
      ) : user.id === callerId ? (
        <p className="text-xs text-tertiary">
          You cannot remove your own account from here.
        </p>
      ) : user.role === 'ADMIN' && callerRole !== 'ADMIN' ? (
        <p className="text-xs text-tertiary">
          Only an admin can remove admin accounts.
        </p>
      ) : null}

      {editable && pendingInvite ? (
        <Button
          type="button"
          color="secondary"
          className="w-full"
          isLoading={resendPending}
          onClick={handleResend}
        >
          Resend invite
        </Button>
      ) : null}

      {editable ? (
        <Button type="button" className="w-full" isLoading={pending} onClick={handleSave}>
          Save changes
        </Button>
      ) : null}
    </div>
  )
}
