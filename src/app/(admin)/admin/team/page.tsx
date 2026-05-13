// /admin/team — list of team members.

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/empty-state'
import { listTeamForAdmin } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

const ROLE_VARIANT: Record<
  'STAFF' | 'MANAGER' | 'ADMIN',
  React.ComponentProps<typeof Badge>['variant']
> = {
  STAFF: 'default',
  MANAGER: 'info',
  ADMIN: 'ok',
}

export default async function AdminTeamPage() {
  const tenant = await getTenant()
  const users = await listTeamForAdmin(tenant.id)

  return (
    <>
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Team</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {users.length} member{users.length === 1 ? '' : 's'} with staff
            access.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/team/new">Add member</Link>
        </Button>
      </header>

      {users.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Add staff to give them access to the cockpit + schedule."
          action={
            <Button asChild>
              <Link href="/admin/team/new">Add member</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/team/${u.id}`}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 text-sm transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[var(--color-text-primary)]">
                    {u.name ?? u.email}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!u.hasPassword ? (
                    <Badge variant="warning">No password</Badge>
                  ) : null}
                  <Badge variant={ROLE_VARIANT[u.role as keyof typeof ROLE_VARIANT] ?? 'default'}>
                    {u.role}
                  </Badge>
                  <span
                    aria-hidden
                    className="hidden text-[var(--color-text-secondary)] md:inline"
                  >
                    ›
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
