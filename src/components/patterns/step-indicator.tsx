import * as React from 'react'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type StepIndicatorProps = {
  currentStep: 1 | 2 | 3 | 4 | 5
  totalSteps?: number
  className?: string
}

export const StepIndicator = React.forwardRef<
  HTMLOListElement,
  StepIndicatorProps
>(function StepIndicator(
  { currentStep, totalSteps = 5, className },
  ref,
) {
  const count = Math.max(1, totalSteps)

  return (
    <ol
      ref={ref}
      aria-label="Booking progress"
      className={cn(
        'flex w-full list-none items-center justify-center gap-2',
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => {
        const step = i + 1
        const isCurrent = step === currentStep
        const isComplete = step < currentStep

        const dotClass = isCurrent
          ? 'h-2 w-[22px] shrink-0 rounded-[3px] bg-[var(--color-action)]'
          : isComplete
            ? 'size-2 shrink-0 rounded-full bg-[var(--color-action)] opacity-35'
            : 'size-2 shrink-0 rounded-full bg-[var(--color-border-strong)]'

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className={dotClass}
          />
        )
      })}
    </ol>
  )
})

StepIndicator.displayName = 'StepIndicator'
