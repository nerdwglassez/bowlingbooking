'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  isContactComplete,
  joinCustomerName,
  splitCustomerName,
} from '@/lib/customer-name'

export type ContactInfoSectionProps = {
  customerName: string
  customerEmail: string
  customerPhone: string
  editing: boolean
  onEditingChange: (editing: boolean) => void
  /** When true, show the read-only contact card instead of the form. */
  compact: boolean
  onChange: (update: {
    name?: string
    email?: string
    phone?: string
  }) => void
  emailInvalid?: boolean
  onEmailBlur?: () => void
  className?: string
}

export function ContactInfoSection({
  customerName,
  customerEmail,
  customerPhone,
  editing,
  onEditingChange,
  compact,
  onChange,
  emailInvalid,
  onEmailBlur,
  className,
}: ContactInfoSectionProps) {
  const { firstName, lastName } = splitCustomerName(customerName)
  const complete = isContactComplete(customerName, customerEmail)
  const showCard = compact && complete && !editing

  function patchName(first: string, last: string) {
    onChange({ name: joinCustomerName(first, last) })
  }

  return (
    <section className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
        Contact information
      </h2>

      {showCard ? (
        <div className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-card)] px-[15px] py-[13px]">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {customerName.trim()}
            </p>
            <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {customerEmail}
              {customerPhone.trim().length > 0 ? (
                <>
                  <br />
                  {customerPhone}
                </>
              ) : null}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 px-0 font-semibold text-[var(--color-action)]"
            onClick={() => onEditingChange(true)}
          >
            Edit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                First name
              </span>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => patchName(e.target.value, lastName)}
                placeholder="First"
                autoComplete="given-name"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                Last name
              </span>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => patchName(firstName, e.target.value)}
                placeholder="Last"
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              Email
            </span>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="you@email.com"
              autoComplete="email"
              invalid={emailInvalid}
              onBlur={onEmailBlur}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
              Phone
            </span>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="(803) 555-0100"
              autoComplete="tel"
            />
          </label>
        </div>
      )}
    </section>
  )
}
