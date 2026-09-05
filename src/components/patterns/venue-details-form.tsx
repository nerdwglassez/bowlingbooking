'use client'

// VenueDetailsForm — controlled form for the Tenant settings page.
// All field state lives on the parent page; this pattern just renders the
// inputs and reports user intent via callbacks.

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { getThemePreset, THEME_PRESETS } from '@/lib/themes'

export interface VenueDetailsFormValues {
  name: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
  cancellationWindowHours: number
  cancellationRefundPercent: number
}

export interface VenueDetailsFormProps {
  values: VenueDetailsFormValues
  onChange: (next: VenueDetailsFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
  successMessage?: string | null
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]

export function VenueDetailsForm({
  values,
  onChange,
  onSubmit,
  submitting,
  error,
  successMessage,
}: VenueDetailsFormProps) {
  function patch(update: Partial<VenueDetailsFormValues>) {
    onChange({ ...values, ...update })
  }

  const selectedPreset = getThemePreset(values.themeSlug)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Venue
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Name</span>
          <Input
            type="text"
            value={values.name}
            onChange={(name) => patch({ name })}
            isRequired
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Address</span>
          <Input
            type="text"
            value={values.address}
            onChange={(address) => patch({ address })}
            isRequired
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Phone</span>
            <Input
              type="tel"
              value={values.phone}
              onChange={(phone) => patch({ phone })}
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Timezone</span>
            <NativeSelect
              value={values.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
              options={TIMEZONES.map((tz) => ({
                label: tz.replace('_', ' '),
                value: tz,
              }))}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Booking policies
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Hold timeout (minutes)
            </span>
            <Input
              type="number"
              value={String(values.holdTimeoutMins)}
              onChange={(value) =>
                patch({ holdTimeoutMins: Number(value) || 1 })
              }
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Max bowlers per online booking
            </span>
            <Input
              type="number"
              value={String(values.maxOnlineBowlers)}
              onChange={(value) =>
                patch({ maxOnlineBowlers: Number(value) || 1 })
              }
              isRequired
            />
          </label>
        </div>
        <p className="text-xs text-tertiary">
          Groups over the max are prompted to call. Hold timeout drives the
          countdown shown on step 3 of the customer flow.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Cancellation window (hours before)
            </span>
            <Input
              type="number"
              value={String(values.cancellationWindowHours)}
              onChange={(value) =>
                patch({
                  cancellationWindowHours: Math.max(
                    0,
                    Math.floor(Number(value) || 0),
                  ),
                })
              }
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">
              Refund percent within window
            </span>
            <Input
              type="number"
              value={String(values.cancellationRefundPercent)}
              onChange={(value) =>
                patch({
                  cancellationRefundPercent: Math.max(
                    0,
                    Math.min(100, Math.floor(Number(value) || 0)),
                  ),
                })
              }
              isRequired
            />
          </label>
        </div>
        <p className="text-xs text-tertiary">
          Customers cancelling before the window receive the configured refund
          percent. Outside the window, no refund is issued. Setting hours = 0
          disables cancellation refunds entirely.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Branding
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Theme preset</span>
          <NativeSelect
            value={values.themeSlug}
            onChange={(e) => patch({ themeSlug: e.target.value })}
            options={THEME_PRESETS.map((p) => ({
              label: p.name,
              value: p.slug,
            }))}
          />
        </label>
        <div className="flex items-start gap-3 text-sm">
          <span
            className="mt-0.5 shrink-0 rounded-lg border border-solid border-secondary"
            style={{
              width: '1rem',
              height: '1rem',
              backgroundColor: selectedPreset.swatchHex,
            }}
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-primary">
              {selectedPreset.name}
            </span>
            {selectedPreset.description ? (
              <span className="text-xs text-tertiary">
                {selectedPreset.description}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-success-primary">{successMessage}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" isLoading={submitting}>
          Save venue details
        </Button>
      </div>
    </form>
  )
}
