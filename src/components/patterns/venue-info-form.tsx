'use client'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { SettingsFieldRow } from '@/components/patterns/settings-field-row'
import { StreetAddressAutocomplete } from '@/components/chrome/street-address-autocomplete'
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
  saveButton?: React.ReactNode
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

export function VenueInfoForm({
  values,
  onChange,
  onSubmit,
  submitting,
  readOnly,
  error,
  successMessage,
  saveButton,
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
      className="flex flex-col"
    >
      <SettingsFieldRow
        label="Venue name"
        hint="Appears in the app header and all customer emails."
        required
      >
        <Input
          type="text"
          aria-label="Venue name"
          value={values.name}
          onChange={(name) => patch({ name })}
          isDisabled={readOnly}
          isRequired
        />
      </SettingsFieldRow>

      <SettingsFieldRow
        label="Street address"
        hint="Suggestions fill city, state, and ZIP when you pick an address."
        required
      >
        <StreetAddressAutocomplete
          value={values.street}
          onChange={(street) => patch({ street })}
          onSelectAddress={(fields) => patch(fields)}
          isDisabled={readOnly}
          isRequired
        />
      </SettingsFieldRow>

      <SettingsFieldRow
        label="City, state, ZIP"
        hint="Address links to maps in the customer app and confirmation emails."
        required
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <Input
              type="text"
              label="City"
              value={values.city}
              onChange={(city) => patch({ city })}
              isDisabled={readOnly}
              isRequired
            />
          </div>
          <div className="sm:col-span-1">
            <Input
              type="text"
              label="State"
              value={values.state}
              onChange={(state) => patch({ state })}
              isDisabled={readOnly}
              isRequired
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="text"
              label="ZIP"
              value={values.zip}
              onChange={(zip) => patch({ zip })}
              isDisabled={readOnly}
              isRequired
            />
          </div>
        </div>
      </SettingsFieldRow>

      <SettingsFieldRow
        label="Phone number"
        hint="Shown as a tappable call link to customers."
        required
      >
        <Input
          type="tel"
          aria-label="Phone number"
          value={values.phone}
          onChange={(phone) => patch({ phone })}
          isDisabled={readOnly}
          isRequired
        />
      </SettingsFieldRow>

      <SettingsFieldRow
        label="Contact email"
        hint="Reply-to address for all booking confirmation emails."
      >
        <Input
          type="email"
          aria-label="Contact email"
          value={values.contactEmail}
          onChange={(contactEmail) => patch({ contactEmail })}
          isDisabled={readOnly}
        />
      </SettingsFieldRow>

      {error ? (
        <p className="pt-4 text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="pt-4 text-sm text-success-primary">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex justify-end pt-4">
          {saveButton ?? (
            <Button type="submit" isLoading={submitting}>
              Save venue info
            </Button>
          )}
        </div>
      ) : null}
    </form>
  )
}
