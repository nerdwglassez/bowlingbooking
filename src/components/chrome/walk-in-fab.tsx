// Floating action button — walk-in entry point on the cockpit (wireframe FAB).

import { Plus } from 'lucide-react'

export type WalkInFabProps = {
  onClick: () => void
  hidden?: boolean
}

export function WalkInFab({ onClick, hidden }: WalkInFabProps) {
  if (hidden) return null

  return (
    <button
      type="button"
      aria-label="New walk-in"
      onClick={onClick}
      className="fixed bottom-20 right-4 z-10 flex size-11 items-center justify-center rounded-full bg-[var(--color-action)] text-[var(--color-text-on-action)] shadow-[0_4px_16px_color-mix(in_srgb,var(--color-action)_40%,transparent)] transition-opacity hover:opacity-90 md:bottom-8"
    >
      <Plus className="size-6" strokeWidth={2.5} aria-hidden />
    </button>
  )
}
