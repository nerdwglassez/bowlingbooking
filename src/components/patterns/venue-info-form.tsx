'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatTenantAddress,
  parseTenantAddress,
} from '@/lib/address-format'

export interface VenueInfoFormValues {
  name: string
  street: string
  city: string
  state: string
  zip: string
  phone: string
  contactEmail: string
}

export interface VenueInfoFormProps {
  values: VenueInfoFormValues
  onChange: (next: VenueInfoFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  readOnly?: boolean
  error?: string | null
  successMessage?: string | null
}

export function venueInfoFromTenant(input: {
  name: string
  address: string
  phone: string
  contactEmail: string
}): VenueInfoFormValues {
  const parsed = parseTenantAddress(input.address)
  return {
    name: input.name,
    street: parsed.street,
    city: parsed.city,
    state: parsed.state,
    zip: parsed.zip,
    phone: input.phone,
    contactEmail: input.contactEmail,
  }
}

export function venueInfoToAddress(values: VenueInfoFormValues): string {
  return formatTenantAddress({
    street: values.street,
    city: values.city,
    state: values.state,
    zip: values.zip,
  })
}

function FieldNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
      {children}
    </p>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
      {children}
    </span>
  )
}

export function VenueInfoForm({
  values,
  onChange,
  onSubmit,
  submitting,
  readOnly,
  error,
  successMessage,
}: VenueInfoFormProps) {
  function patch(update: Partial<VenueInfoFormValues>) {
    onChange({ ...values, ...update })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!readOnly) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Identity
        </h2>
        <label className="flex flex-col">
          <FieldLabel>Venue name</FieldLabel>
          <Input
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            disabled={readOnly}
            required
          />
          <FieldNote>Appears in the app header and all customer emails.</FieldNote>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Address
        </h2>
        <label className="flex flex-col">
          <FieldLabel>Street address</FieldLabel>
          <Input
            type="text"
            value={values.street}
            onChange={(e) => patch({ street: e.target.value })}
            disabled={readOnly}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col">
            <FieldLabel>City</FieldLabel>
            <Input
              type="text"
              value={values.city}
              onChange={(e) => patch({ city: e.target.value })}
              disabled={readOnly}
              required
            />
          </label>
          <label className="flex flex-col">
            <FieldLabel>State</FieldLabel>
            <Input
              type="text"
              value={values.state}
              onChange={(e) => patch({ state: e.target.value })}
              disabled={readOnly}
              required
            />
          </label>
        </div>
        <label className="flex flex-col">
          <FieldLabel>ZIP code</FieldLabel>
          <Input
            type="text"
            value={values.zip}
            onChange={(e) => patch({ zip: e.target.value })}
            disabled={readOnly}
            required
          />
          <FieldNote>
            Address links to maps in the customer app and confirmation emails.
          </FieldNote>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Contact
        </h2>
        <label className="flex flex-col">
          <FieldLabel>Phone number</FieldLabel>
          <Input
            type="tel"
            value={values.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            disabled={readOnly}
            required
          />
          <FieldNote>Shown as a tappable call link to customers.</FieldNote>
        </label>
        <label className="flex flex-col">
          <FieldLabel>Contact email</FieldLabel>
          <Input
            type="email"
            value={values.contactEmail}
            onChange={(e) => patch({ contactEmail: e.target.value })}
            disabled={readOnly}
          />
          <FieldNote>Reply-to address for all booking confirmation emails.</FieldNote>
        </label>
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <Button type="submit" fullWidth loading={submitting}>
          Save venue info
        </Button>
      ) : null}
    </form>
  )
}
