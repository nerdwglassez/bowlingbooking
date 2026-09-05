'use client'

import { useState } from 'react'

import { signOutAction } from '@/app/signin/actions'
import { Button } from '@/components/base/buttons/button'
import { BottomSheet } from '@/components/chrome/bottom-sheet'

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
      <p className="text-sm text-tertiary">Sign out of {venueName} Staff?</p>
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="button"
          color="primary-destructive"
          size="md"
          isLoading={submitting}
          onClick={() => void handleSignOut()}
        >
          Sign out
        </Button>
        <Button type="button" color="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </BottomSheet>
  )
}
