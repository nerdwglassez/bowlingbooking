/*
 * Customer route group layout.
 *
 * Theme: light by default, toggleable by the user.
 * Root layout's THEME_SCRIPT already handles initial paint from localStorage
 * (or system preference). No additional theme logic needed here.
 *
 * This layout intentionally renders no chrome — pages inside (customer)/
 * provide their own headers, footers, and booking shell patterns.
 *
 * PWA: customer Add-to-Home-Screen uses the customer manifest + Apple meta
 * (staff overrides these under `(staff)/layout.tsx`).
 */

import type { Metadata, Viewport } from 'next'

import { customerPwaMetadata, customerPwaViewport } from '@/lib/pwa-manifest'
import { getTenant } from '@/lib/tenant'

export async function generateMetadata(): Promise<Metadata> {
  return customerPwaMetadata(await getTenant())
}

export const viewport: Viewport = customerPwaViewport

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
