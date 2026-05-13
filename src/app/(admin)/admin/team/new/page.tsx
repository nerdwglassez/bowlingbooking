// /admin/team/new — invite a new team member.

import Link from 'next/link'

import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { TeamEditor } from '../team-editor'

export default async function NewTeamMemberPage() {
  // requireRole here gives us the CALLER's role for the ADMIN-assignment check.
  // The layout already gated MANAGER/ADMIN; this second call just retrieves
  // the current user.
  const [tenant, caller] = await Promise.all([
    getTenant(),
    requireRole('MANAGER', 'ADMIN'),
  ])
  const callerRole = caller.role as 'MANAGER' | 'ADMIN'

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/team"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to team
        </Link>
        <h1 className="text-2xl">Add team member</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Creates a sign-in identity. Tell the new team member their initial
          password out of band; they can change it after first sign-in.
        </p>
      </header>
      <TeamEditor
        mode="create"
        tenantId={tenant.id}
        callerRole={callerRole}
        callerId={caller.id}
      />
    </>
  )
}
