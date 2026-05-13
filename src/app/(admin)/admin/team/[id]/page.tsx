// /admin/team/[id] — edit an existing team member.

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTeamUserForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { TeamEditor } from '../team-editor'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditTeamMemberPage({ params }: PageProps) {
  const { id } = await params
  const [tenant, target, caller] = await Promise.all([
    getTenant(),
    getTeamUserForAdmin(id),
    requireRole('MANAGER', 'ADMIN'),
  ])
  if (!target) notFound()
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
        <h1 className="text-2xl">{target.name ?? target.email}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {target.email} · {target.role}
          {!target.hasPassword
            ? ' · no password set (can\u2019t sign in)'
            : ''}
        </p>
      </header>
      <TeamEditor
        mode="edit"
        tenantId={tenant.id}
        callerRole={callerRole}
        callerId={caller.id}
        initial={target}
      />
    </>
  )
}
