// /staff/settings/hours — read-only operating hours for STAFF role.

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { getOperatingHours } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export default async function StaffSettingsHoursPage() {
  const tenant = await getTenant()
  const hours = await getOperatingHours(tenant.id)

  return (
    <>
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/staff/settings">← Settings</Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Operating hours</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            View only — contact a manager to make changes.
          </p>
        </div>
      </header>

      <Card variant="flat">
        <CardBody className="flex flex-col gap-0 p-0">
          <ul>
            {hours.map((row) => (
              <li
                key={row.dayOfWeek}
                className="flex items-center justify-between gap-4 border-b border-solid border-[var(--color-border)] px-4 py-3 last:border-b-0"
              >
                <span className="min-w-9 text-sm font-medium text-[var(--color-text-primary)]">
                  {DAY_NAMES[row.dayOfWeek]}
                </span>
                {row.closed ? (
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    Closed
                  </span>
                ) : (
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {formatTime(row.openTime)} – {formatTime(row.closeTime)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  )
}
