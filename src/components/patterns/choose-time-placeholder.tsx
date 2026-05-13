'use client'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type ChooseTimePlaceholderProps = {
  /** When false, show wireframe 1a empty state (date not chosen yet). */
  hasDate: boolean
  className?: string
}

/**
 * Wireframe Step 1a/1b — "Choose a time" field block on `/book` before the user
 * opens `/book/time` (split-flow equivalent of the disabled time column).
 */
export function ChooseTimePlaceholder({
  hasDate,
  className,
}: ChooseTimePlaceholderProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-sunken)] p-3',
        className,
      )}
    >
      <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        Choose a time
      </h2>
      <p
        className="py-4 text-center text-xs text-[var(--color-text-muted)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {hasDate
          ? 'Pick your start time on the next screen — tap the button below.'
          : 'Select a date to see available times'}
      </p>
    </section>
  )
}
