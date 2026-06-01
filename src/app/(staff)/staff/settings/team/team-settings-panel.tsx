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
  updateTeamUserAction,
} from '@/lib/actions/admin'

const ROLE_VARIANT: Record<
  'STAFF' | 'MANAGER' | 'ADMIN',
  React.ComponentProps<typeof Badge>['variant']
> = {
  STAFF: 'default',
  MANAGER: 'info',
  ADMIN: 'ok',
}

export function TeamSettingsPanel({
  tenantId,
  users,
  callerRole,
}: {
  tenantId: string
  users: AdminUserRow[]
  callerRole: 'ADMIN'
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
          {users.map((u) => (
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
                </div>
                <Badge variant={ROLE_VARIANT[u.role as keyof typeof ROLE_VARIANT]}>
                  {u.role}
                </Badge>
              </button>
            </li>
          ))}
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
        onClose={() => setDetailUser(null)}
        onSaved={() => {
          setDetailUser(null)
          showToast({ message: 'Team member updated', variant: 'success' })
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
  callerRole: 'ADMIN'
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'STAFF' | 'MANAGER' | 'ADMIN'>('STAFF')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        await createTeamUserAction({
          tenantId,
          email,
          initialPassword: password,
          role,
          name: undefined,
          phone: undefined,
        })
        setEmail('')
        setPassword('')
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
          <span className="text-[var(--color-text-secondary)]">
            Temporary password
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Role</span>
          <Select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'STAFF' | 'MANAGER' | 'ADMIN')
            }
          >
            <option value="STAFF">Staff</option>
            <option value="MANAGER">Manager</option>
            {callerRole === 'ADMIN' ? (
              <option value="ADMIN">Admin</option>
            ) : null}
          </Select>
        </label>
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
  onClose,
  onSaved,
}: {
  open: boolean
  user: AdminUserRow | null
  callerRole: 'ADMIN'
  onClose: () => void
  onSaved: () => void
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
          onSaved={onSaved}
        />
      ) : null}
    </BottomSheet>
  )
}

function DetailSheetForm({
  user,
  callerRole,
  onSaved,
}: {
  user: AdminUserRow
  callerRole: 'ADMIN'
  onSaved: () => void
}) {
  const [name, setName] = useState(user.name ?? '')
  const [role, setRole] = useState<'STAFF' | 'MANAGER' | 'ADMIN'>(
    user.role as 'STAFF' | 'MANAGER' | 'ADMIN',
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateTeamUserAction({
          userId: user.id,
          name,
          phone: user.phone,
          role,
        })
        onSaved()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update member.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Name</span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Role</span>
        <Select
          value={role}
          onChange={(e) =>
            setRole(e.target.value as 'STAFF' | 'MANAGER' | 'ADMIN')
          }
        >
          <option value="STAFF">Staff</option>
          <option value="MANAGER">Manager</option>
          {callerRole === 'ADMIN' ? (
            <option value="ADMIN">Admin</option>
          ) : null}
        </Select>
      </label>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <Button type="button" fullWidth loading={pending} onClick={handleSave}>
        Save changes
      </Button>
    </div>
  )
}
