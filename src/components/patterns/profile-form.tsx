'use client'

import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import { Input } from '@/components/ui/input'
import type { SettingsSavePhase } from '@/lib/use-settings-form-state'

export interface ProfileFormValues {
  name: string
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface ProfileFormProps {
  values: ProfileFormValues
  initialEmail: string
  onChange: (next: ProfileFormValues) => void
  onSubmit: () => void
  error?: string | null
  dirty?: boolean
  phase?: SettingsSavePhase
}

export function ProfileForm({
  values,
  initialEmail,
  onChange,
  onSubmit,
  error,
  dirty,
  phase = 'idle',
}: ProfileFormProps) {
  function patch(update: Partial<ProfileFormValues>) {
    onChange({ ...values, ...update })
  }

  const emailChanged =
    values.email.trim().toLowerCase() !== initialEmail.trim().toLowerCase()
  const changingPassword = values.newPassword.length > 0
  const passwordRequired = emailChanged || changingPassword

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Full name</span>
          <Input
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Email</span>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => patch({ email: e.target.value })}
            autoComplete="email"
            required
          />
          <span className="text-[10px] text-[var(--color-text-secondary)]">
            Changing email updates your sign-in address.
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Password
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Current password
            {passwordRequired ? null : ' (only if changing email or password)'}
          </span>
          <Input
            type="password"
            value={values.currentPassword}
            onChange={(e) => patch({ currentPassword: e.target.value })}
            autoComplete="current-password"
            required={passwordRequired}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            New password (optional)
          </span>
          <Input
            type="password"
            value={values.newPassword}
            onChange={(e) => patch({ newPassword: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        {changingPassword ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Confirm new password
            </span>
            <Input
              type="password"
              value={values.confirmPassword}
              onChange={(e) => patch({ confirmPassword: e.target.value })}
              autoComplete="new-password"
              required
            />
          </label>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      <SettingsSaveButton
        label="Save profile"
        dirty={dirty ?? true}
        phase={phase}
      />
    </form>
  )
}
