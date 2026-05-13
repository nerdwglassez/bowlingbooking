'use client'

// UserForm — controlled form for create/edit of a team User.
//
// Two modes (selected by parent):
//   - create: shows the initial-password field, requires email + role
//   - edit: hides the password field; the parent surfaces a separate
//           "Reset password" affordance via the resetPanel slot.
//
// All state lives on the parent page; this pattern just renders the inputs.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export type TeamRole = 'STAFF' | 'MANAGER' | 'ADMIN'

export interface UserFormValues {
  email: string
  name: string
  phone: string
  role: TeamRole
  initialPassword: string
}

export interface UserFormProps {
  mode: 'create' | 'edit'
  values: UserFormValues
  onChange: (next: UserFormValues) => void
  onSubmit: () => void
  /** When true, the role select includes ADMIN. */
  canAssignAdmin: boolean
  submitting?: boolean
  error?: string | null
  successMessage?: string | null
  submitLabel?: string
  /** Slot for an in-place "Reset password" panel (edit mode only). */
  resetPanel?: React.ReactNode
}

export function UserForm({
  mode,
  values,
  onChange,
  onSubmit,
  canAssignAdmin,
  submitting,
  error,
  successMessage,
  submitLabel,
  resetPanel,
}: UserFormProps) {
  function patch(update: Partial<UserFormValues>) {
    onChange({ ...values, ...update })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Identity
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Email</span>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => patch({ email: e.target.value })}
            required
            disabled={mode === 'edit'}
          />
          {mode === 'edit' ? (
            <span className="text-xs text-[var(--color-text-secondary)]">
              Email is the sign-in identifier and cannot be changed here.
            </span>
          ) : null}
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Name</span>
            <Input
              type="text"
              value={values.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Casey Manager"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Phone</span>
            <Input
              type="tel"
              value={values.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="(555) 555-5555"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Role
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <Select
            value={values.role}
            onChange={(e) => patch({ role: e.target.value as TeamRole })}
          >
            <option value="STAFF">Staff (front of house)</option>
            <option value="MANAGER">Manager (refunds + settings)</option>
            {canAssignAdmin ? (
              <option value="ADMIN">Admin (everything)</option>
            ) : null}
          </Select>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {canAssignAdmin
              ? 'Only ADMINs can assign the ADMIN role.'
              : 'Promote-to-ADMIN requires an existing ADMIN.'}
          </span>
        </label>
      </section>

      {mode === 'create' ? (
        <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Initial password
          </h2>
          <label className="flex flex-col gap-1 text-sm">
            <Input
              type="text"
              value={values.initialPassword}
              onChange={(e) => patch({ initialPassword: e.target.value })}
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
            <span className="text-xs text-[var(--color-text-secondary)]">
              Tell the new team member this password out of band. They can
              change it after their first sign-in.
            </span>
          </label>
        </section>
      ) : null}

      {resetPanel}

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitLabel ?? (mode === 'create' ? 'Create team member' : 'Save changes')}
      </Button>
    </form>
  )
}
