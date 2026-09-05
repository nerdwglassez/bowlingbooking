'use client'

// Floating action button — walk-in entry point on the cockpit.

import { Plus } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'

export type WalkInFabProps = {
  onClick: () => void
  hidden?: boolean
}

export function WalkInFab({ onClick, hidden }: WalkInFabProps) {
  if (hidden) return null

  return (
    <Button
      type="button"
      color="primary"
      size="lg"
      iconLeading={Plus}
      aria-label="New walk-in"
      onClick={onClick}
      className="fixed right-4 bottom-6 z-10 rounded-full lg:bottom-8"
    />
  )
}
