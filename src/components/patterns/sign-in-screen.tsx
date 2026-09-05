import type { ReactNode } from 'react'

export type SignInScreenProps = {
  venueName: string
  year: number
  children: ReactNode
}

/**
 * Untitled split login: form on the left (stacked on mobile), quote image
 * on the right from `lg`. Dummy Untitled logo / Google / Sign up / carousel
 * arrows are omitted. Copy reflects role-aware routing after credentials.
 */
export function SignInScreen({ venueName, year, children }: SignInScreenProps) {
  const initial = venueName.trim().charAt(0).toUpperCase() || 'R'

  return (
    <div className="flex min-h-dvh bg-primary">
      <section className="relative flex w-full flex-col px-4 py-12 lg:min-w-[480px] lg:flex-1 lg:items-center lg:justify-center lg:px-8">
        <div className="mb-6 flex items-center gap-2.5 lg:absolute lg:top-8 lg:left-8 lg:mb-0">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-sm font-semibold text-white shadow-xs"
          >
            {initial}
          </span>
          <span className="text-md font-semibold text-primary">{venueName}</span>
        </div>

        <div className="flex w-full max-w-[360px] flex-col gap-8 lg:mx-auto">
          <div className="flex flex-col gap-2 lg:gap-3">
            <h1 className="text-xl font-semibold text-primary lg:text-display-xs">
              Welcome back
            </h1>
            <p className="text-md text-tertiary">
              Sign in and we&apos;ll send you to staff tools or your bookings.
            </p>
          </div>
          {children}
        </div>

        <p className="mt-auto hidden pt-8 text-sm text-tertiary lg:absolute lg:bottom-8 lg:left-8 lg:mt-0 lg:block lg:pt-0">
          © {year} {venueName}
        </p>
      </section>

      <section className="relative hidden min-w-0 flex-1 overflow-hidden rounded-l-[80px] lg:block">
        <img
          src="/signin-hero.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[79%] to-black/10" />
        <div className="absolute inset-x-14 bottom-14 flex flex-col gap-6">
          <p className="[font-family:var(--font-display)] text-display-md font-medium tracking-tight text-white">
            Sign in once. Staff land in the cockpit; guests land on their
            bookings.
          </p>
          <div className="flex flex-col gap-3 text-white">
            <p className="text-display-xs font-semibold">{venueName}</p>
            <div className="flex flex-col gap-0.5">
              <p className="text-lg font-semibold">Lane reservations</p>
              <p className="text-md font-medium">
                Staff tools and guest bookings
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
