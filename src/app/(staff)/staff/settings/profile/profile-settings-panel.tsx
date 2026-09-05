'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import {
  ProfileForm,
  type ProfileFormValues,
} from '@/components/patterns/profile-form'
import { updateProfileAction } from '@/lib/actions/admin'
import { joinDisplayName, splitDisplayName } from '@/lib/display-name'
import { useSettingsFormReporter } from '@/lib/settings-form-context'
import { formatStaffRole } from '@/lib/staff-nav'
import { useSettingsFormState } from '@/lib/use-settings-form-state'
import type { Role } from '@/types'

export function ProfileSettingsPanel({
  initial,
}: {
  initial: { name: string; email: string; role: Role }
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const split = splitDisplayName(initial.name)
  const form = useSettingsFormState<ProfileFormValues>({
    firstName: split.firstName,
    lastName: split.lastName,
    email: initial.email,
    currentPassword: '',
    newPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useSettingsFormReporter(
    form.dirty,
    form.phase === 'saving',
    () => handleSubmit(),
  )

  function handleSubmit() {
    setError(null)
    const emailChanged =
      form.values.email.trim().toLowerCase() !==
      initial.email.trim().toLowerCase()
    const changingPassword = form.values.newPassword.length > 0

    if (
      (emailChanged || changingPassword) &&
      !form.values.currentPassword
    ) {
      setError('Enter your current password to change email or password.')
      return
    }

    form.startSaving()
    startTransition(async () => {
      try {
        await updateProfileAction({
          name: joinDisplayName(
            form.values.firstName,
            form.values.lastName,
          ),
          email: form.values.email,
          currentPassword: form.values.currentPassword || undefined,
          newPassword: form.values.newPassword || undefined,
        })
        const cleared = {
          ...form.values,
          currentPassword: '',
          newPassword: '',
        }
        form.setValues(cleared)
        form.commitBaseline(cleared)
        showToast({ message: 'Profile updated', variant: 'success' })
        router.refresh()
      } catch (err) {
        form.setError()
        setError(err instanceof Error ? err.message : 'Could not save profile.')
        showToast({ message: 'Failed to save — try again', variant: 'error' })
      }
    })
  }

  return (
    <ProfileForm
      values={form.values}
      roleLabel={formatStaffRole(initial.role)}
      initialEmail={initial.email}
      onChange={form.setValues}
      onSubmit={handleSubmit}
      onCancel={form.resetToBaseline}
      error={error}
      dirty={form.dirty}
      phase={form.phase}
    />
  )
}
