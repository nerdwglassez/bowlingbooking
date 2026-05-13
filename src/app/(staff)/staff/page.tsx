// Placeholder staff index. Replaced in Phase 8 by the staff cockpit shell.

import { getCurrentUser } from '@/lib/auth'

export default async function StaffIndexPage() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl">Staff</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Signed in as {user?.email ?? 'unknown'} · role {user?.role ?? 'unknown'}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Phase 8 builds the cockpit here. The route group enforces STAFF or
        higher — see <code>src/app/(staff)/layout.tsx</code>.
      </p>
    </main>
  )
}
