import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Unauthorized() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl">Access denied</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Your account is signed in but does not have permission for this page.
        Use a staff or admin account, or ask a manager to update your role.
      </p>
      <Button asChild variant="primary" size="md">
        <Link href="/signin?from=/staff">Back to sign in</Link>
      </Button>
    </main>
  )
}
