'use client'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type BookingFlowLeadProps = {
  title: string
  subtitle: string
  className?: string
}

/** Display title + subtitle for booking steps (wireframe `step-title` / `step-sub`). */
export function BookingFlowLead({
  title,
  subtitle,
  className,
}: BookingFlowLeadProps) {
  return (
    <div className={cn(className)}>
      <h1
        className="text-2xl text-[var(--color-text-primary)] lg:text-[1.625rem]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)] lg:mt-1.5 lg:text-[15px]">
        {subtitle}
      </p>
    </div>
  )
}
