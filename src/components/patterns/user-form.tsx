'use client'

// UserForm — controlled form for create/edit of a team User.
//
// Two modes (selected by parent):
//   - create: email + role; invite email sent by server action
//   - edit: the parent surfaces a separate "Reset password" affordance
//           via the resetPanel slot.
//
// All state lives on the parent page; this pattern just renders the inputs.

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { TextArea } from '@/components/base/textarea/textarea'

export type TeamRole = 'STAFF' | 'MANAGER' | 'ADMIN'

export interface UserFormValues {
  email: string
  name: string
  phone: string
  role: TeamRole
  personalMessage: string
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
      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Identity
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Email</span>
          <Input
            type="email"
            value={values.email}
            onChange={(email) => patch({ email })}
            isRequired
            isDisabled={mode === 'edit'}
          />
          {mode === 'edit' ? (
            <span className="text-xs text-tertiary">
              Email is the sign-in identifier and cannot be changed here.
            </span>
          ) : null}
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Name</span>
            <Input
              type="text"
              value={values.name}
              onChange={(name) => patch({ name })}
              placeholder="Casey Manager"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Phone</span>
            <Input
              type="tel"
              value={values.phone}
              onChange={(phone) => patch({ phone })}
              placeholder="(555) 555-5555"
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Role
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <NativeSelect
            value={values.role}
            onChange={(e) => patch({ role: e.target.value as TeamRole })}
            options={[
              { label: 'Staff (front of house)', value: 'STAFF' },
              { label: 'Manager (refunds + settings)', value: 'MANAGER' },
              ...(canAssignAdmin
                ? [{ label: 'Admin (everything)', value: 'ADMIN' }]
                : []),
            ]}
          />
          <span className="text-xs text-tertiary">
            {canAssignAdmin
              ? 'Only ADMINs can assign the ADMIN role.'
              : 'Promote-to-ADMIN requires an existing ADMIN.'}
          </span>
        </label>
      </section>

      {mode === 'create' ? (
        <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
          <h2 className="text-xs uppercase tracking-wide text-tertiary">
            Invitation
          </h2>
          <TextArea
            label="Personal message (optional)"
            hint="An invite link will be sent to their email. It expires in 48 hours; they set their own password when they accept."
            rows={3}
            value={values.personalMessage}
            onChange={(personalMessage) => patch({ personalMessage })}
            placeholder="Welcome to the team!"
          />
        </section>
      ) : null}

      {resetPanel}

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-success-primary">{successMessage}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        {submitLabel ?? (mode === 'create' ? 'Send invite' : 'Save changes')}
      </Button>
    </form>
  )
}
