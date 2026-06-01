'use client'

import { useState } from 'react'

import { signOutAction } from '@/app/signin/actions'
import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Button } from '@/components/ui/button'

export function SignOutConfirmSheet({
  venueName,
  open,
  onClose,
}: {
  venueName: string
  open: boolean
  onClose: () => void
}) {
  const [submitting, setSubmitting] = useState(false)

  async function handleSignOut() {
    setSubmitting(true)
    try {
      await signOutAction()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet open={open} title="Sign out" onClose={onClose}>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Sign out of {venueName} Staff?
      </p>
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="button"
          variant="danger"
          fullWidth
          loading={submitting}
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </BottomSheet>
  )
}
