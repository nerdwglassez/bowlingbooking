'use client'

import { Button } from '@/components/base/buttons/button'
import { BottomSheet } from '@/components/chrome/bottom-sheet'

export function SettingsUnsavedDialog({
  open,
  onSave,
  onDiscard,
  onKeepEditing,
  saving,
}: {
  open: boolean
  onSave: () => void
  onDiscard: () => void
  onKeepEditing: () => void
  saving?: boolean
}) {
  return (
    <BottomSheet open={open} title="Unsaved changes" onClose={onKeepEditing}>
      <p className="text-sm text-tertiary">
        You have unsaved changes. Save before leaving?
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Button type="button" isLoading={saving} onClick={onSave}>
          Save
        </Button>
        <Button type="button" color="secondary" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" color="tertiary" onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </BottomSheet>
  )
}
