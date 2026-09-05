'use client'

import type { ReactNode } from 'react'
import { Lock03, Mail01 } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { cx } from '@/lib/cx'
import { SettingsFieldRow } from '@/components/patterns/settings-field-row'
import type { SettingsSavePhase } from '@/lib/use-settings-form-state'

export interface ProfileFormValues {
  firstName: string
  lastName: string
  email: string
  currentPassword: string
  newPassword: string
}

export interface ProfileFormProps {
  values: ProfileFormValues
  roleLabel: string
  initialEmail: string
  onChange: (next: ProfileFormValues) => void
  onSubmit: () => void
  onCancel: () => void
  error?: string | null
  dirty?: boolean
  phase?: SettingsSavePhase
}

function ProfileFieldRow({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <SettingsFieldRow label={label} hint={hint} required={required}>
      {children}
    </SettingsFieldRow>
  )
}

export function ProfileForm({
  values,
  roleLabel,
  initialEmail,
  onChange,
  onSubmit,
  onCancel,
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
  const saving = phase === 'saving'
  let saveLabel = 'Save'
  if (phase === 'saving') saveLabel = 'Saving…'
  else if (phase === 'saved') saveLabel = 'Saved ✓'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-lg font-semibold text-primary">Personal info</h2>
        <p className="text-sm text-tertiary">
          Update your name, email, and password.
        </p>
      </div>

      <ProfileFieldRow label="Name" required>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            aria-label="First name"
            placeholder="First name"
            value={values.firstName}
            onChange={(firstName) => patch({ firstName })}
            isRequired
            autoComplete="given-name"
          />
          <Input
            aria-label="Last name"
            placeholder="Last name"
            value={values.lastName}
            onChange={(lastName) => patch({ lastName })}
            isRequired
            autoComplete="family-name"
          />
        </div>
      </ProfileFieldRow>

      <ProfileFieldRow
        label="Email address"
        hint="Changing this updates your sign-in address."
        required
      >
        <Input
          type="email"
          aria-label="Email address"
          icon={Mail01}
          value={values.email}
          onChange={(email) => patch({ email })}
          isRequired
          autoComplete="email"
        />
      </ProfileFieldRow>

      <ProfileFieldRow label="Role" hint="Assigned by a venue admin.">
        <Input
          aria-label="Role"
          value={roleLabel}
          isDisabled
          isReadOnly
        />
      </ProfileFieldRow>

      <ProfileFieldRow
        label="Password"
        hint={
          passwordRequired
            ? 'Current password is required to change email or password.'
            : 'Leave blank unless you are changing your password.'
        }
        required={passwordRequired}
      >
        <div className="flex flex-col gap-4">
          <Input
            type="password"
            aria-label="Current password"
            icon={Lock03}
            placeholder="Enter your current password…"
            value={values.currentPassword}
            onChange={(currentPassword) => patch({ currentPassword })}
            autoComplete="current-password"
            isRequired={passwordRequired}
          />
          <Input
            type="password"
            aria-label="New password"
            icon={Lock03}
            placeholder="Enter a new password…"
            value={values.newPassword}
            onChange={(newPassword) => patch({ newPassword })}
            autoComplete="new-password"
            hint="Must be at least 8 characters."
          />
        </div>
      </ProfileFieldRow>

      {error ? (
        <p className="pt-4 text-sm text-error-primary" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={cx(
          'flex justify-end gap-3 pt-4',
        )}
      >
        <Button
          type="button"
          color="secondary"
          size="md"
          isDisabled={saving || !(dirty ?? true)}
          onPress={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          color="primary"
          size="md"
          isLoading={saving}
          isDisabled={!(dirty ?? true) || saving}
        >
          {saveLabel}
        </Button>
      </div>
    </form>
  )
}
