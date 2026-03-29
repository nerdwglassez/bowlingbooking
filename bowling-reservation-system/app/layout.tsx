import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: 'StrikeZone Bowling – Book a Lane',
  description: 'Book your lane online at StrikeZone Bowling. Reserve in seconds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'StrikeZone',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon/192',
    apple: '/icon/192',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}



