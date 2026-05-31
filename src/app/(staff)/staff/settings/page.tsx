// /staff/settings — settings hub (tab 5 in the unified staff app).
//
// Role-filtered grouped list per staff/06_SETTINGS.md and
// docs/wireframes/admin/settings-venue-details.html.

import { SettingsListItem } from '@/components/patterns/settings-list-item'
import { SettingsSignOutItem } from '@/components/patterns/settings-sign-out-item'
import { getSettingsHubMeta } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getSettingsGroups } from '@/lib/staff-nav'
import { getTenant } from '@/lib/tenant'

export default async function StaffSettingsPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const meta = await getSettingsHubMeta(tenant.id)
  const groups = getSettingsGroups(user.role, meta)
  const isStaffOnly = user.role === 'STAFF'

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="[font-family:var(--font-display)] text-[22px] text-[var(--color-text-primary)]">
          Settings
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-2">
            <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={`${group.label}-${item.label}`}>
                  {item.action === 'sign-out' ? (
                    <SettingsSignOutItem venueName={tenant.name} />
                  ) : (
                    <SettingsListItem
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      sub={item.sub || undefined}
                      viewOnly={item.viewOnly}
                      variant={item.variant}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isStaffOnly ? (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Need more access? Contact your venue admin.
        </p>
      ) : null}
    </>
  )
}
