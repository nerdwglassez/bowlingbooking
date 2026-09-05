'use client'

import { Button } from '@/components/base/buttons/button'
import type { SettingsSavePhase } from '@/lib/use-settings-form-state'

export interface SettingsSaveButtonProps {
  label: string
  dirty: boolean
  phase: SettingsSavePhase
  readOnly?: boolean
  fullWidth?: boolean
}

export function SettingsSaveButton({
  label,
  dirty,
  phase,
  readOnly,
  fullWidth = true,
}: SettingsSaveButtonProps) {
  if (readOnly) return null

  let text = label
  if (phase === 'saving') text = 'Saving…'
  else if (phase === 'saved') text = 'Saved ✓'

  return (
    <Button
      type="submit"
      className={fullWidth ? 'w-full lg:w-auto' : undefined}
      isLoading={phase === 'saving'}
      isDisabled={!dirty || phase === 'saving'}
    >
      {text}
    </Button>
  )
}
