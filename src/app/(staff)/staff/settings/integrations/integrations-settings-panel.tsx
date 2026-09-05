'use client'

import { useState, useTransition } from 'react'
import { CreditCard02, Mail01, Zap } from '@untitledui/icons'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Button } from '@/components/base/buttons/button'
import { Toggle } from '@/components/base/toggle/toggle'
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon'
import { getStripeConnectOnboardingUrl } from '@/lib/actions/admin'

type IntegrationKey = 'stripe' | 'resend' | 'make'

type IntegrationCard = {
  key: IntegrationKey
  title: string
  status: string
  summary: string
  detail: string
}

const INTEGRATION_ICON = {
  stripe: CreditCard02,
  resend: Mail01,
  make: Zap,
} as const

function isConnected(status: string) {
  return status.trim().toLowerCase() === 'connected'
}

export function IntegrationsSettingsPanel({
  cards,
}: {
  cards: IntegrationCard[]
}) {
  const [openKey, setOpenKey] = useState<IntegrationKey | null>(null)
  const [pending, startTransition] = useTransition()
  const { showToast } = useStaffToast()
  const active = cards.find((c) => c.key === openKey)

  return (
    <>
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-md font-semibold text-primary">Connected apps</h2>
        <p className="text-sm text-tertiary">
          Payments, email, and optional automation for this venue.
        </p>
      </div>

      <ul className="flex flex-col">
        {cards.map((card) => {
          const connected = isConnected(card.status)
          return (
            <li
              key={card.key}
              className="flex flex-col gap-4 border-b border-secondary py-5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FeaturedIcon
                  icon={INTEGRATION_ICON[card.key]}
                  color="gray"
                  theme="modern"
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    {card.title}
                  </p>
                  <p className="text-sm text-tertiary">{card.summary}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3">
                <Button
                  type="button"
                  color="link-color"
                  size="sm"
                  onClick={() => setOpenKey(card.key)}
                >
                  Learn more
                </Button>
                <Toggle
                  size="sm"
                  isSelected={connected}
                  isDisabled
                  aria-label={`${card.title} ${connected ? 'connected' : 'not connected'}`}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <BottomSheet
        open={active != null}
        title={active?.title ?? 'Integration'}
        onClose={() => setOpenKey(null)}
      >
        {active ? (
          <div className="flex flex-col gap-3 text-sm text-tertiary">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {active.status}
            </p>
            <p>{active.detail}</p>
            {active.key === 'stripe' ? (
              <Button
                type="button"
                isLoading={pending}
                className="w-full lg:w-auto"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const { url, message } =
                        await getStripeConnectOnboardingUrl()
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer')
                        showToast({ message, variant: 'success' })
                      } else {
                        showToast({ message, variant: 'error' })
                      }
                    } catch (err) {
                      showToast({
                        message:
                          err instanceof Error
                            ? err.message
                            : 'Could not open Stripe Connect.',
                        variant: 'error',
                      })
                    }
                  })
                }}
              >
                Open Stripe Connect
              </Button>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>
    </>
  )
}
