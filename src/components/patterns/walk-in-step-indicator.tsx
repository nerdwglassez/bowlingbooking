'use client'

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
            className={
              active
                ? 'h-1.5 w-4 rounded-full bg-brand-solid'
                : done
                  ? 'size-1.5 rounded-full bg-brand-solid opacity-40'
                  : 'size-1.5 rounded-full bg-quaternary'
            }
            aria-hidden
          />
        )
      })}
    </div>
  )
}
