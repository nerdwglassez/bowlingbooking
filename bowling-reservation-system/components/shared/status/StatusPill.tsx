import { cn } from '@/lib/utils'
import { getBookingStatusPresentation, type BookingStatusTone } from '@/components/shared/status/bookingStatus'

type StatusPillSize = 'sm' | 'md'

type StatusPillProps = {
  label: string
  tone?: BookingStatusTone
  size?: StatusPillSize
  className?: string
}

type BookingStatusPillContext = 'default' | 'staff' | 'staff-dashboard'

const toneClasses: Record<BookingStatusTone, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
  danger: 'bg-red-100 text-red-800',
  neutral: 'bg-gray-100 text-gray-800',
}

const sizeClasses: Record<StatusPillSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function getBookingStatusPill(
  status: string,
  options?: { context?: BookingStatusPillContext }
): { label: string; className: string; tone: BookingStatusTone } {
  const presentation = getBookingStatusPresentation(status, options?.context)
  return {
    label: presentation.label,
    tone: presentation.tone,
    className: toneClasses[presentation.tone],
  }
}

export function BookingStatusPill({
  status,
  label,
  context = 'default',
  size = 'sm',
  variant,
  className,
}: {
  status: string
  label?: string
  context?: BookingStatusPillContext
  size?: StatusPillSize
  variant?: BookingStatusTone
  className?: string
}) {
  const mapped = getBookingStatusPill(status, { context })
  return (
    <StatusPill
      label={label ?? mapped.label}
      tone={variant ?? mapped.tone}
      size={size}
      className={cn(mapped.className, className)}
    />
  )
}

export default function StatusPill({
  label,
  tone = 'neutral',
  size = 'sm',
  className,
}: StatusPillProps) {
  return (
    <span className={cn('inline-flex rounded font-medium', sizeClasses[size], toneClasses[tone], className)}>
      {label}
    </span>
  )
}
