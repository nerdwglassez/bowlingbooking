/*
 * Root landing — placeholder for Phase 1 boot-up. The Customer pages agent
 * (Phase 5) replaces this with either a redirect to /book or the real venue
 * landing, depending on the final IA decision.
 *
 * No inline color/font styles — body and heading styles flow from
 * src/app/globals.css via the token system. Tailwind utilities here are
 * layout-only (flex, padding, gap), which is allowed.
 */
export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center gap-6">
      <h1 className="text-3xl">Royal Z Lanes</h1>
      <p className="max-w-sm">
        Online booking is coming soon. The build is in Phase 1 — design system
        foundation. Check back as the customer flow comes online.
      </p>
    </main>
  )
}
