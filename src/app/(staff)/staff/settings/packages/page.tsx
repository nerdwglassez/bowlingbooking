// /staff/settings/packages — read-only package list for STAFF role.

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { formatPrice } from '@/lib/pricing'
import { getTenant } from '@/lib/tenant'

export default async function StaffSettingsPackagesPage() {
  const tenant = await getTenant()
  const packages = await getPackagesForTenant(tenant.id)

  return (
    <>
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/staff/settings">← Settings</Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Packages</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            View only — contact a manager to make changes.
          </p>
        </div>
      </header>

      {packages.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          No packages configured.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {packages.map((pkg) => (
            <li key={pkg.id}>
              <Card variant="flat">
                <CardBody className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-medium text-[var(--color-text-primary)]">
                      {pkg.name}
                    </h2>
                    <span className="shrink-0 text-sm [font-family:var(--font-display)] text-[var(--color-text-primary)]">
                      {formatPrice(pkg.basePrice)}
                    </span>
                  </div>
                  {pkg.description ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {pkg.description}
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
