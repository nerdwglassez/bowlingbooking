'use client'

import { useState } from 'react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Card, CardBody } from '@/components/ui/card'

type IntegrationKey = 'stripe' | 'resend' | 'make'

type IntegrationCard = {
  key: IntegrationKey
  title: string
  status: string
  summary: string
  detail: string
}

export function IntegrationsSettingsPanel({
  cards,
}: {
  cards: IntegrationCard[]
}) {
  const [openKey, setOpenKey] = useState<IntegrationKey | null>(null)
  const active = cards.find((c) => c.key === openKey)

  return (
    <>
      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <li key={card.key}>
            <button
              type="button"
              onClick={() => setOpenKey(card.key)}
              className="w-full text-left"
            >
              <Card variant="flat">
                <CardBody className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                      {card.title}
                    </h2>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {card.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {card.summary}
                  </p>
                </CardBody>
              </Card>
            </button>
          </li>
        ))}
      </ul>

      <BottomSheet
        open={active != null}
        title={active?.title ?? 'Integration'}
        onClose={() => setOpenKey(null)}
      >
        {active ? (
          <div className="flex flex-col gap-3 p-4 text-sm text-[var(--color-text-secondary)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
              {active.status}
            </p>
            <p>{active.detail}</p>
          </div>
        ) : null}
      </BottomSheet>
    </>
  )
}
