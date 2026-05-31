// /staff/settings/profile — account settings (all roles).

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { Card, CardBody } from '@/components/ui/card'
import { requireRole } from '@/lib/auth'

export default async function StaffSettingsProfilePage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')

  return (
    <>
      <SettingsSubpageHeader
        title="My profile"
        subtitle="Name, email, and password."
      />
      <Card variant="flat">
        <CardBody className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              Name
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {user.name ?? 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
              Email
            </p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {user.email ?? 'Not set'}
            </p>
            <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
              This is your sign-in email.
            </p>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Profile editing is coming soon. Contact an admin to update your
            account details.
          </p>
        </CardBody>
      </Card>
    </>
  )
}
