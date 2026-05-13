import type { Metadata } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import { resolveTheme } from '@/lib/theme'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = await resolveTheme()

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
