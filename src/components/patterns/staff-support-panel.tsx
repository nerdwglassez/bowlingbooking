'use client'

import {
  Building07,
  LifeBuoy01,
  Mail01,
  MarkerPin01,
  Phone,
} from '@untitledui/icons'

import { EmptyState } from '@/components/application/empty-state/empty-state'
import { Button } from '@/components/base/buttons/button'

export type StaffSupportPanelProps = {
  venueName: string
  phone: string
  address: string
  email: string | null
}

export function StaffSupportPanel({
  venueName,
  phone,
  address,
  email,
}: StaffSupportPanelProps) {
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`
  const mailHref = email ? `mailto:${email}` : null
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(address)}`

  return (
    <div className="flex flex-col gap-6">
      <EmptyState size="md">
        <EmptyState.Header>
          <EmptyState.FeaturedIcon
            icon={LifeBuoy01}
            color="brand"
            theme="modern"
          />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>Need help?</EmptyState.Title>
          <EmptyState.Description>
            Reach the {venueName} team with the contacts below. For product bugs
            or account access, include your venue name in the message.
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState>

      <section className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex items-start gap-3">
          <Building07 className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-tertiary">Venue</p>
            <p className="text-sm font-semibold text-primary">{venueName}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-tertiary">Phone</p>
            <a
              href={telHref}
              className="text-sm font-semibold text-brand-secondary"
            >
              {phone}
            </a>
          </div>
        </div>

        {email ? (
          <div className="flex items-start gap-3">
            <Mail01 className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-tertiary">Email</p>
              <a
                href={mailHref!}
                className="break-all text-sm font-semibold text-brand-secondary"
              >
                {email}
              </a>
            </div>
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <MarkerPin01 className="mt-0.5 size-5 shrink-0 text-fg-quaternary" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-tertiary">Address</p>
            <p className="text-sm text-primary">{address}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button href={telHref} size="sm" color="secondary" iconLeading={Phone}>
            Call venue
          </Button>
          {mailHref ? (
            <Button
              href={mailHref}
              size="sm"
              color="secondary"
              iconLeading={Mail01}
            >
              Email venue
            </Button>
          ) : null}
          <Button
            href={mapsHref}
            size="sm"
            color="secondary"
            iconLeading={MarkerPin01}
          >
            Open map
          </Button>
        </div>
      </section>
    </div>
  )
}
