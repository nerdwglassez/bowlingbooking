'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { AdminUserRow } from '@/lib/actions/admin'
import {
  createTeamUserAction,
  deactivateTeamUserAction,
  updateTeamUserAction,
} from '@/lib/actions/admin'
import { resendTeamInviteAction } from '@/lib/actions/team-invite'

type CallerRole = 'MANAGER' | 'ADMIN'
type TeamRole = 'STAFF' | 'MANAGER' | 'ADMIN'

const ROLE_VARIANT: Record<
  TeamRole,
  React.ComponentProps<typeof Badge>['variant']
> = {
  STAFF: 'default',
  MANAGER: 'info',
  ADMIN: 'ok',
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

export function TeamSettingsPanel({
  tenantId,
  users,
  callerRole,
  callerId,
}: {
  tenantId: string
  users: AdminUserRow[]
  callerRole: CallerRole
  callerId: string
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null)

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Invite member
        </Button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No team members yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => {
            const pending = !u.hasPassword
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setDetailUser(u)}
                  className="flex w-full flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-[var(--color-text-primary)]">
                      {u.name ?? 'Unnamed'}
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {u.email}
                    </span>
                    {pending ? (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {formatInvitedAgo(new Date(u.createdAt))}
                      </span>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      pending
                        ? 'warning'
                        : ROLE_VARIANT[u.role as TeamRole]
                    }
                  >
                    {pending ? 'Pending' : u.role}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <InviteSheet
        open={inviteOpen}
        tenantId={tenantId}
        callerRole={callerRole}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false)
          showToast({ message: 'Team member invited', variant: 'success' })
          router.refresh()
        }}
      />

      <DetailSheet
        open={detailUser != null}
        user={detailUser}
        callerRole={callerRole}
        callerId={callerId}
        onClose={() => setDetailUser(null)}
        onSaved={() => {
          setDetailUser(null)
          showToast({ message: 'Team member updated', variant: 'success' })
          router.refresh()
        }}
        onResent={() => {
          showToast({ message: 'Invite resent', variant: 'success' })
          router.refresh()
        }}
        onRemoved={() => {
          setDetailUser(null)
          showToast({ message: 'Team member removed', variant: 'success' })
          router.refresh()
        }}
      />
    </>
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
  onSuccess: () => void
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
        await createTeamUserAction({
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
        onSuccess()
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
          <span className="text-[var(--color-text-secondary)]">Email</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Role</span>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
            {callerRole === 'ADMIN' ? (
              <option value="ADMIN">Admin</option>
            ) : null}
          </Select>
          {callerRole === 'MANAGER' ? (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Managers can invite staff and other managers only.
            </span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Personal message (optional)
          </span>
          <textarea
            rows={3}
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            placeholder="Welcome to the team!"
          />
        </label>
        <p className="text-xs text-[var(--color-text-secondary)]">
          An invite link will be sent to their email. The link expires in{' '}
          <strong>48 hours</strong>. They&apos;ll set their own password when
          they accept.
        </p>
        {error ? (
          <p className="text-sm text-[var(--status-error-text)]">{error}</p>
        ) : null}
        <Button type="submit" fullWidth loading={pending}>
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
  onRemoved,
}: {
  open: boolean
  user: AdminUserRow | null
  callerRole: CallerRole
  callerId: string
  onClose: () => void
  onSaved: () => void
  onResent: () => void
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
  onRemoved,
}: {
  user: AdminUserRow
  callerRole: CallerRole
  callerId: string
  onSaved: () => void
  onResent: () => void
  onRemoved: () => void
}) {
  const [name, setName] = useState(user.name ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [role, setRole] = useState<TeamRole>(user.role as TeamRole)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [pending, startTransition] = useTransition()
  const [resendPending, startResend] = useTransition()
  const [removePending, startRemove] = useTransition()
  const pendingInvite = !user.hasPassword
  const editable = canEditTeamMember(callerRole, user)
  const removable = canRemoveTeamMember(callerRole, user, callerId)

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
        await resendTeamInviteAction({ userId: user.id })
        onResent()
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

  const displayName = user.name ?? user.email

  return (
    <div className="flex flex-col gap-3 p-4">
      {!editable ? (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Only an admin can edit admin accounts.
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Email</span>
        <Input type="email" value={user.email} disabled />
      </label>

      {pendingInvite ? (
        <p className="text-xs text-[var(--color-text-secondary)]">
          {formatInvitedAgo(new Date(user.createdAt))} — waiting for them to
          accept.
        </p>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">
          {user.hasPassword ? 'Active account' : 'No password set'}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Name</span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!editable}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Phone</span>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-5555"
          disabled={!editable}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Role</span>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
          disabled={!editable}
        >
          <option value="STAFF">Staff</option>
          <option value="MANAGER">Manager</option>
          {callerRole === 'ADMIN' ? (
            <option value="ADMIN">Admin</option>
          ) : null}
        </Select>
        {callerRole === 'MANAGER' && user.role === 'ADMIN' ? (
          <span className="text-xs text-[var(--color-text-secondary)]">
            Admin role cannot be changed by a manager.
          </span>
        ) : null}
      </label>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      {editable && pendingInvite ? (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          loading={resendPending}
          onClick={handleResend}
        >
          Resend invite
        </Button>
      ) : null}

      {editable ? (
        <Button type="button" fullWidth loading={pending} onClick={handleSave}>
          Save changes
        </Button>
      ) : null}

      {removable ? (
        <div className="mt-2 flex flex-col gap-2 border-t border-solid border-[var(--color-border)] pt-4">
          {confirmRemove ? (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Remove {displayName} from the team? They will lose staff access
                immediately.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  loading={removePending}
                  onClick={handleRemove}
                >
                  Revoke access
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  disabled={removePending}
                  onClick={() => setConfirmRemove(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="text-[var(--status-error-text)]"
              onClick={() => setConfirmRemove(true)}
            >
              Revoke access
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
