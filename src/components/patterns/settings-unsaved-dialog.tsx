'use client'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Button } from '@/components/ui/button'

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
      <p className="text-sm text-[var(--color-text-secondary)]">
        You have unsaved changes. Save before leaving?
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Button type="button" fullWidth loading={saving} onClick={onSave}>
          Save
        </Button>
        <Button type="button" variant="secondary" fullWidth onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onKeepEditing}>
          Keep editing
        </Button>
      </div>
    </BottomSheet>
  )
}
