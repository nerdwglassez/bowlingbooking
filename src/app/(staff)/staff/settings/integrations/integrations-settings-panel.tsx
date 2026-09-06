'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard02, Mail01, Zap } from '@untitledui/icons'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useStaffToast } from '@/components/chrome/staff-toast-provider'
import { Button } from '@/components/base/buttons/button'
import { Toggle } from '@/components/base/toggle/toggle'
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon'
import {
  connectSoftIntegrationAction,
  disconnectIntegrationAction,
  getStripeConnectOnboardingUrl,
  setIntegrationEnabledAction,
  type IntegrationCardState,
} from '@/lib/actions/admin'
import type { IntegrationId } from '@/lib/integrations'

const INTEGRATION_ICON = {
  stripe: CreditCard02,
  resend: Mail01,
  make: Zap,
} as const

type PanelMode = 'connect' | 'manage'

export function IntegrationsSettingsPanel({
  cards,
  stripeFlash,
}: {
  cards: IntegrationCardState[]
  stripeFlash: 'return' | 'refresh' | null
}) {
  const router = useRouter()
  const { showToast } = useStaffToast()
  const [pending, startTransition] = useTransition()
  const [openId, setOpenId] = useState<IntegrationId | null>(null)
  const [mode, setMode] = useState<PanelMode>('connect')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [rows, setRows] = useState(cards)
  const [cardsSnapshot, setCardsSnapshot] = useState(cards)

  // Sync server props into local optimistic rows without an effect (avoids
  // react-hooks/set-state-in-effect cascading-render lint).
  if (cards !== cardsSnapshot) {
    setCardsSnapshot(cards)
    setRows(cards)
  }

  useEffect(() => {
    if (!stripeFlash) return
    if (stripeFlash === 'return') {
      showToast({
        message: 'Returned from Stripe — connection status refreshed.',
        variant: 'success',
      })
    } else {
      showToast({
        message: 'Stripe onboarding needs another try. Connect again when ready.',
        variant: 'error',
      })
    }
    router.replace('/staff/settings/integrations')
  }, [stripeFlash, router, showToast])

  const active = rows.find((c) => c.id === openId) ?? null

  function openConnect(id: IntegrationId) {
    setConfirmDelete(false)
    setMode('connect')
    setOpenId(id)
  }

  function openManage(id: IntegrationId) {
    setConfirmDelete(false)
    setMode('manage')
    setOpenId(id)
  }

  function closePanel() {
    setOpenId(null)
    setConfirmDelete(false)
  }

  function onToggle(card: IntegrationCardState, enabled: boolean) {
    if (!card.connected) {
      openConnect(card.id)
      return
    }
    setRows((prev) =>
      prev.map((row) => (row.id === card.id ? { ...row, enabled } : row)),
    )
    startTransition(async () => {
      try {
        await setIntegrationEnabledAction(card.id, enabled)
        showToast({
          message: enabled
            ? `${card.title} turned on.`
            : `${card.title} turned off.`,
          variant: 'success',
        })
        router.refresh()
      } catch (err) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === card.id ? { ...row, enabled: card.enabled } : row,
          ),
        )
        showToast({
          message:
            err instanceof Error ? err.message : 'Could not update integration.',
          variant: 'error',
        })
      }
    })
  }

  function onConnect(card: IntegrationCardState) {
    startTransition(async () => {
      try {
        if (card.id === 'stripe') {
          const { url, message } = await getStripeConnectOnboardingUrl()
          if (!url) {
            showToast({ message, variant: 'error' })
            return
          }
          showToast({ message, variant: 'success' })
          window.location.assign(url)
          return
        }
        await connectSoftIntegrationAction(card.id)
        showToast({
          message: `${card.title} connected.`,
          variant: 'success',
        })
        closePanel()
        router.refresh()
      } catch (err) {
        showToast({
          message:
            err instanceof Error
              ? err.message
              : 'Could not connect integration.',
          variant: 'error',
        })
      }
    })
  }

  function onDisconnect(card: IntegrationCardState) {
    startTransition(async () => {
      try {
        await disconnectIntegrationAction(card.id)
        showToast({
          message: `${card.title} removed.`,
          variant: 'success',
        })
        closePanel()
        router.refresh()
      } catch (err) {
        showToast({
          message:
            err instanceof Error
              ? err.message
              : 'Could not remove integration.',
          variant: 'error',
        })
      }
    })
  }

  return (
    <>
      <div className="flex flex-col gap-1 pb-5">
        <h2 className="text-md font-semibold text-primary">Integrations</h2>
        <p className="text-sm text-tertiary">
          Connect payments, email, and automation. Connecting opens a sign-in
          and permissions step, then returns you here.
        </p>
      </div>

      <ul className="flex flex-col">
        {rows.map((card) => {
          const Icon = INTEGRATION_ICON[card.id]
          return (
            <li
              key={card.id}
              className="flex flex-col gap-4 border-b border-secondary py-5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <FeaturedIcon icon={Icon} color="gray" theme="modern" size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-primary">
                      {card.title}
                    </p>
                    {card.required ? (
                      <span className="rounded-full bg-error-secondary px-2 py-0.5 text-xs font-medium text-error-primary">
                        Required
                      </span>
                    ) : null}
                    {card.connected ? (
                      <span className="rounded-full bg-success-secondary px-2 py-0.5 text-xs font-medium text-success-primary">
                        Connected
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-tertiary">{card.summary}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                {card.connected ? (
                  <>
                    <Button
                      type="button"
                      color="link-color"
                      size="sm"
                      onClick={() => openManage(card.id)}
                    >
                      View details
                    </Button>
                    <Toggle
                      size="sm"
                      isSelected={card.enabled}
                      isDisabled={pending}
                      onChange={(selected) => onToggle(card, selected)}
                      aria-label={`${card.title} ${card.enabled ? 'on' : 'off'}`}
                    />
                  </>
                ) : (
                  <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    onClick={() => openConnect(card.id)}
                  >
                    Add integration
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <BottomSheet
        open={active != null}
        title={
          active
            ? mode === 'connect'
              ? `Connect ${active.title}`
              : active.title
            : 'Integration'
        }
        onClose={closePanel}
      >
        {active ? (
          mode === 'connect' ? (
            <ConnectPanelBody
              card={active}
              pending={pending}
              onConnect={() => onConnect(active)}
              onClose={closePanel}
            />
          ) : (
            <ManagePanelBody
              card={active}
              pending={pending}
              confirmDelete={confirmDelete}
              onConfirmDeleteChange={setConfirmDelete}
              onToggle={(enabled) => onToggle(active, enabled)}
              onDisconnect={() => onDisconnect(active)}
            />
          )
        ) : null}
      </BottomSheet>
    </>
  )
}

function ConnectPanelBody({
  card,
  pending,
  onConnect,
  onClose,
}: {
  card: IntegrationCardState
  pending: boolean
  onConnect: () => void
  onClose: () => void
}) {
  const connectBlocked = !card.platformReady && card.id === 'resend'

  return (
    <div className="flex flex-col gap-4 text-sm text-tertiary">
      <p>{card.detail}</p>
      <div className="rounded-xl bg-secondary p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Permissions you will grant
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {card.permissions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {card.id === 'stripe' ? (
        <p className="text-xs text-tertiary">
          You will leave this app to sign in with Stripe, confirm access, then
          return to Integrations.
        </p>
      ) : (
        <p className="text-xs text-tertiary">
          Confirming connects this venue to the platform credentials already
          configured for {card.title}.
        </p>
      )}
      {connectBlocked ? (
        <p className="rounded-lg bg-warning-secondary px-3 py-2 text-sm text-warning-primary">
          Platform credentials are missing. Connect stays blocked until they are
          configured.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          color="secondary"
          size="md"
          onClick={onClose}
          isDisabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          color="primary"
          size="md"
          isLoading={pending}
          isDisabled={connectBlocked}
          onClick={onConnect}
        >
          {card.id === 'stripe'
            ? 'Connect with Stripe'
            : `Connect ${card.title}`}
        </Button>
      </div>
    </div>
  )
}

function ManagePanelBody({
  card,
  pending,
  confirmDelete,
  onConfirmDeleteChange,
  onToggle,
  onDisconnect,
}: {
  card: IntegrationCardState
  pending: boolean
  confirmDelete: boolean
  onConfirmDeleteChange: (value: boolean) => void
  onToggle: (enabled: boolean) => void
  onDisconnect: () => void
}) {
  return (
    <div className="flex flex-col gap-4 text-sm text-tertiary">
      <p>{card.detail}</p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-primary">Enabled</p>
          <p className="text-xs text-tertiary">
            Turn off to pause without removing the connection.
          </p>
        </div>
        <Toggle
          size="md"
          isSelected={card.enabled}
          isDisabled={pending}
          onChange={onToggle}
          aria-label={`${card.title} enabled`}
        />
      </div>
      <div className="rounded-xl bg-secondary p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Access granted
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {card.permissions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {!confirmDelete ? (
        <Button
          type="button"
          color="link-destructive"
          size="sm"
          className="self-start"
          onClick={() => onConfirmDeleteChange(true)}
        >
          Remove integration
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-error-secondary p-4">
          <p className="text-sm text-error-primary">
            Remove {card.title}?
            {card.id === 'stripe'
              ? ' Online payments will stop until you connect again.'
              : ' Related features may pause until you connect again.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              color="secondary"
              size="md"
              isDisabled={pending}
              onClick={() => onConfirmDeleteChange(false)}
            >
              Keep connected
            </Button>
            <Button
              type="button"
              color="primary-destructive"
              size="md"
              isLoading={pending}
              onClick={onDisconnect}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
