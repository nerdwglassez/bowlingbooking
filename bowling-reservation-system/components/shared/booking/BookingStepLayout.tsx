import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const STEP_NAV_BUTTON_BASE = 'rounded-full min-h-[48px] px-6'

type BookingStepLayoutProps = {
  children: ReactNode
  className?: string
}

type BookingStepActionsProps = {
  children?: ReactNode
  align?: 'between' | 'end'
  onBack?: () => void
  backLabel?: string
  backDisabled?: boolean
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  continueLoading?: boolean
  hideBack?: boolean
  className?: string
  helperText?: ReactNode
}

export function BookingStepLayout({ children, className }: BookingStepLayoutProps) {
  return <div className={cn('step-content-enter space-y-6', className)}>{children}</div>
}

export function BookingStepActions({
  children,
  align = 'between',
  onBack,
  backLabel = 'Back',
  backDisabled = false,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  hideBack = false,
  className,
  helperText,
}: BookingStepActionsProps) {
  if (children) {
    return (
      <>
        <div
          className={cn(
            'mt-6 border-t-2 border-[#CAD8EC] pt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-3',
            align === 'between' ? 'sm:justify-between' : 'sm:justify-end',
            className
          )}
        >
          {children}
        </div>
        {helperText}
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          'mt-6 border-t-2 border-[#CAD8EC] pt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3',
          className
        )}
      >
        {hideBack ? (
          <span aria-hidden />
        ) : (
          <Button
            variant="secondary"
            onClick={onBack}
            disabled={backDisabled || !onBack}
            className={`${STEP_NAV_BUTTON_BASE} w-full sm:w-auto !bg-white !text-[#6366F1] !border !border-[#6366F1]/30 hover:!bg-[#F8FAFF]`}
          >
            {backLabel}
          </Button>
        )}
        <Button
          onClick={onContinue}
          isLoading={continueLoading}
          disabled={continueDisabled || !onContinue}
          className={`${STEP_NAV_BUTTON_BASE} w-full sm:w-auto`}
        >
          {continueLabel}
        </Button>
      </div>
      {helperText}
    </>
  )
}

type BookingStepSectionProps = {
  children: ReactNode
  className?: string
}

export function BookingStepSection({ children, className }: BookingStepSectionProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E2E8F0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06),0px_1px_3px_0px_rgba(0,0,0,0.1)]',
        className
      )}
    >
      {children}
    </div>
  )
}

