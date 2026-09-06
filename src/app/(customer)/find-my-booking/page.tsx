// /find-my-booking — customer self-service entry point.
//
// Anonymous-friendly. No auth. The form posts to a Server Action that
// looks up the booking by (email + confirmation code) and redirects to
// the detail page on success. On failure, a generic message renders —
// never leak which half was wrong.

import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getBookingByLookup } from '@/lib/actions/customer'
import { getTenant } from '@/lib/tenant'

async function lookupAction(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  const code = String(formData.get('code') ?? '').trim()
  if (!email || !code) {
    redirect('/find-my-booking?error=missing')
  }
  const booking = await getBookingByLookup({ email, confirmationCode: code })
  if (!booking) {
    redirect('/find-my-booking?error=notfound')
  }
  redirect(
    `/find-my-booking/${booking.confirmationCode}?email=${encodeURIComponent(email)}`,
  )
}

type PageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function FindMyBookingPage({ searchParams }: PageProps) {
  const tenant = await getTenant()
  const params = await searchParams
  const error = errorMessage(params.error)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[600px] flex-col gap-6 px-4 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          {tenant.name}
        </span>
        <h1 className="text-2xl">Find my booking</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Enter your email and confirmation code to view or cancel your
          booking.
        </p>
      </header>

      <Card>
        <CardBody>
          <form action={lookupAction} className="flex flex-col gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">Email</span>
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">
                Confirmation code
              </span>
              <Input
                type="text"
                name="code"
                required
                maxLength={8}
                placeholder="6-character code"
                autoCapitalize="characters"
              />
            </label>
            {error ? (
              <p className="text-[var(--status-error-text)]">{error}</p>
            ) : null}
            <Button type="submit" size="lg" fullWidth>
              View booking
            </Button>
          </form>
        </CardBody>
      </Card>
    </main>
  )
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'missing':
      return 'Enter both your email and confirmation code.'
    case 'notfound':
      return 'We could not find a booking matching those details. Double-check the code and email used at checkout.'
    default:
      return null
  }
}
