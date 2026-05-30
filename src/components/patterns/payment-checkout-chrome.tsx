'use client'

import type { ReactNode } from 'react'

export type PaymentErrorBannerProps = {
  message: string
  className?: string
}

export function PaymentErrorBanner({
  message,
  className,
}: PaymentErrorBannerProps) {
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--status-error-border)]',
        'bg-[var(--status-error-bg)] px-[13px] py-2.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="shrink-0 text-[13px]" aria-hidden>
        ⚠️
      </span>
      <p className="text-xs leading-snug text-[var(--status-error-text)]">
        {message}
      </p>
    </div>
  )
}

export type PaymentProcessingOverlayProps = {
  className?: string
  message?: string
  submessage?: string
}

export function PaymentProcessingOverlay({
  className,
  message = 'Processing your payment…',
  submessage = "Please don't close this page",
}: PaymentProcessingOverlayProps) {
  return (
    <div
      className={[
        'absolute inset-0 z-10 flex flex-col items-center justify-center gap-3',
        'rounded-[var(--radius-xl)] bg-[var(--surface-ground)]/85 px-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <div
        className="size-9 animate-spin rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-action)]"
        aria-hidden
      />
      <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">
        {message}
      </p>
      {submessage ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">{submessage}</p>
      ) : null}
    </div>
  )
}

export type StripePaymentShellProps = {
  children: ReactNode
  errored?: boolean
  className?: string
}

/** Wireframe 4a card-details container around Stripe PaymentElement. */
export function StripePaymentShell({
  children,
  errored = false,
  className,
}: StripePaymentShellProps) {
  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
        Card details
      </h2>
      <div
        className={[
          'rounded-[var(--radius-lg)] border-[1.5px] bg-[var(--surface-card)] p-4',
          errored
            ? 'border-[var(--status-error-border)]'
            : 'border-[var(--color-border)]',
        ].join(' ')}
      >
        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          <span aria-hidden>🔒</span>
          Secured by Stripe
        </p>
        {children}
        <div className="mt-3 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2 py-2">
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Your payment info is encrypted and never stored by us
          </p>
        </div>
      </div>
    </div>
  )
}
