// /admin — settings overview.
//
// Server Component. Pulls a quick snapshot of the venue, active packages,
// and team size so admins land on something actionable, not an empty page.

import Link from 'next/link'
import { Building2, Tag, Users } from 'lucide-react'

import { Card, CardBody } from '@/components/ui/card'
import {
  getTenantForAdmin,
  listPackagesForAdmin,
  listTeamForAdmin,
} from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

export default async function AdminIndexPage() {
  const tenant = await getTenant()
  const [tenantDetail, packages, team] = await Promise.all([
    getTenantForAdmin(tenant.id),
    listPackagesForAdmin(tenant.id),
    listTeamForAdmin(tenant.id),
  ])

  const activePackages = packages.filter((p) => p.active).length
  const archivedPackages = packages.length - activePackages

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage venue info, packages, and team members.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <AdminCard
          href="/admin/venue"
          icon={Building2}
          title="Venue"
          stat={tenantDetail?.name ?? 'Not loaded'}
          subline={`${tenantDetail?.timezone ?? ''} · hold ${tenantDetail?.holdTimeoutMins ?? '—'} min`}
        />
        <AdminCard
          href="/admin/packages"
          icon={Tag}
          title="Packages"
          stat={`${activePackages} active`}
          subline={
            archivedPackages > 0
              ? `${archivedPackages} archived`
              : 'No archived packages'
          }
        />
        <AdminCard
          href="/admin/team"
          icon={Users}
          title="Team"
          stat={`${team.length} member${team.length === 1 ? '' : 's'}`}
          subline={`${team.filter((u) => u.role === 'ADMIN' || u.role === 'MANAGER').length} with elevated access`}
        />
      </div>

      <Card variant="flat">
        <CardBody className="flex flex-col gap-2 text-sm">
          <h2 className="text-lg">What&apos;s next</h2>
          <ul className="flex flex-col gap-1 text-[var(--color-text-secondary)]">
            <li>
              Promo codes, booking policies, and integrations land in Phase
              10.
            </li>
            <li>
              Audit log shows every settings change — surfaced in Phase 10.
            </li>
          </ul>
        </CardBody>
      </Card>
    </>
  )
}

function AdminCard({
  href,
  icon: Icon,
  title,
  stat,
  subline,
}: {
  href: string
  icon: typeof Building2
  title: string
  stat: string
  subline: string
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          {title}
        </h2>
        <Icon
          className="size-4 text-[var(--color-text-secondary)]"
          aria-hidden
        />
      </div>
      <p className="mt-2 text-lg [font-family:var(--font-display)] text-[var(--color-text-primary)]">
        {stat}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
        {subline}
      </p>
    </Link>
  )
}
