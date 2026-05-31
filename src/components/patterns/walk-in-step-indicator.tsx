'use client'

// WalkInStepIndicator — 3-dot step progress (walkin-booking-flow.html).

export type WalkInStepIndicatorProps = {
  step: 1 | 2 | 3
}

export function WalkInStepIndicator({ step }: WalkInStepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => {
        const active = n === step
        const done = n < step
        return (
          <span
            key={n}
            className={`h-1.5 rounded-full ${
              active
                ? 'w-[18px] bg-[var(--color-action)]'
                : done
                  ? 'w-1.5 bg-[var(--color-action)] opacity-40'
                  : 'w-1.5 bg-[var(--color-border-strong)]'
            }`}
            aria-hidden
          />
        )
      })}
    </div>
  )
}
