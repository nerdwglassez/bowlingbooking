import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import { resolveStaffBrand, resolveTheme } from '@/lib/theme'
import {
  DEFAULT_THEME_SLUG,
  isValidThemeSlug,
} from '@/lib/themes'
import { getTenant } from '@/lib/tenant'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant()
  return {
    title: tenant.name,
    description: `Book a lane at ${tenant.name}`,
  }
}

/** Uses headers (theme path) + DB (tenant) — never statically prerender. */
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, tenant, staffBrand] = await Promise.all([
    resolveTheme(),
    getTenant(),
    resolveStaffBrand(),
  ])
  const themePreset = isValidThemeSlug(tenant.themeSlug)
    ? tenant.themeSlug
    : DEFAULT_THEME_SLUG

  return (
    <html
      lang="en"
      data-theme={theme}
      data-app={staffBrand ? 'staff' : undefined}
      data-theme-preset={themePreset}
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
