'use client'

// VenueDetailsForm — controlled form for the Tenant settings page.
// All field state lives on the parent page; this pattern just renders the
// inputs and reports user intent via callbacks.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Venue
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Name</span>
          <Input
            type="text"
            value={values.name}
            onChange={(e) => patch({ name: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Address</span>
          <Input
            type="text"
            value={values.address}
            onChange={(e) => patch({ address: e.target.value })}
            required
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Phone</span>
            <Input
              type="tel"
              value={values.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Timezone</span>
            <Select
              value={values.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Booking policies
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Hold timeout (minutes)
            </span>
            <Input
              type="number"
              min={1}
              max={60}
              value={values.holdTimeoutMins}
              onChange={(e) =>
                patch({ holdTimeoutMins: Number(e.target.value) || 1 })
              }
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Max bowlers per online booking
            </span>
            <Input
              type="number"
              min={1}
              max={36}
              value={values.maxOnlineBowlers}
              onChange={(e) =>
                patch({ maxOnlineBowlers: Number(e.target.value) || 1 })
              }
              required
            />
          </label>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Groups over the max are prompted to call. Hold timeout drives the
          countdown shown on step 3 of the customer flow.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Cancellation window (hours before)
            </span>
            <Input
              type="number"
              min={0}
              max={240}
              step={1}
              value={values.cancellationWindowHours}
              onChange={(e) =>
                patch({
                  cancellationWindowHours: Math.max(
                    0,
                    Math.floor(Number(e.target.value) || 0),
                  ),
                })
              }
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Refund percent within window
            </span>
            <Input
              type="number"
              min={0}
              max={100}
              step={1}
              value={values.cancellationRefundPercent}
              onChange={(e) =>
                patch({
                  cancellationRefundPercent: Math.max(
                    0,
                    Math.min(100, Math.floor(Number(e.target.value) || 0)),
                  ),
                })
              }
              required
            />
          </label>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Customers cancelling before the window receive the configured refund
          percent. Outside the window, no refund is issued. Setting hours = 0
          disables cancellation refunds entirely.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Branding
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Theme preset</span>
          <Select
            value={values.themeSlug}
            onChange={(e) => patch({ themeSlug: e.target.value })}
          >
            {THEME_PRESETS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-start gap-3 text-sm">
          <span
            className="mt-0.5 shrink-0 rounded-[var(--radius-sm)] border border-solid border-[var(--color-border)]"
            style={{
              width: '1rem',
              height: '1rem',
              backgroundColor: selectedPreset.swatchHex,
            }}
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[var(--color-text-primary)]">
              {selectedPreset.name}
            </span>
            {selectedPreset.description ? (
              <span className="text-xs text-[var(--color-text-secondary)]">
                {selectedPreset.description}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Save venue details
        </Button>
      </div>
    </form>
  )
}
