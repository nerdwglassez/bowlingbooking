import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import { resolveTheme } from '@/lib/theme'
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

export const metadata: Metadata = {
  title: 'Royal Z Lanes',
  description: 'Book a lane at Royal Z Lanes',
}

/** Uses headers (theme path) + DB (tenant) — never statically prerender. */
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, tenant] = await Promise.all([resolveTheme(), getTenant()])
  const themePreset = isValidThemeSlug(tenant.themeSlug)
    ? tenant.themeSlug
    : DEFAULT_THEME_SLUG

  return (
    <html
      lang="en"
      data-theme={theme}
      data-theme-preset={themePreset}
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
