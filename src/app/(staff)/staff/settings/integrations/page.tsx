// /staff/settings/integrations — integration status (ADMIN only).

import { unauthorized } from 'next/navigation'

import { Card, CardBody } from '@/components/ui/card'
import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { requireRole } from '@/lib/auth'

export default async function StaffSettingsIntegrationsPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role !== 'ADMIN') unauthorized()

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim())

  return (
    <>
      <SettingsSubpageHeader
        title="Integrations"
        subtitle="Payments, automation, and email delivery."
      />
      <ul className="flex flex-col gap-2">
        <li>
          <Card variant="flat">
            <CardBody className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                  Stripe
                </h2>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {stripeConfigured ? 'Connected' : 'Required · not connected'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Online payments go directly to your Stripe account.
              </p>
            </CardBody>
          </Card>
        </li>
        <li>
          <Card variant="flat">
            <CardBody className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                  Resend
                </h2>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {resendConfigured ? 'Connected' : 'Optional · not configured'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Transactional email for confirmations and receipts.
              </p>
            </CardBody>
          </Card>
        </li>
        <li>
          <Card variant="flat">
            <CardBody className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                  Make
                </h2>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Optional
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Webhook automation — detail sheet coming in a later release.
              </p>
            </CardBody>
          </Card>
        </li>
      </ul>
    </>
  )
}
