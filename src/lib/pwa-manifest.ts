import type { Metadata, MetadataRoute, Viewport } from 'next'

import type { Tenant } from '@/types'

/**
 * Web App Manifest / iOS `theme-color` require literal hex (CSS variables are
 * not resolved). Keep these here — drift allowlists this file for that reason.
 * Spec: `.claude/staff/07_RESPONSIVE_PWA.md`.
 */
export const PWA_CUSTOMER_BACKGROUND = '#F5F2EE'
export const PWA_THEME_COLOR = '#1E0A2E'
export const PWA_STAFF_BACKGROUND = '#1E0A2E'

/** Truncate a venue name for home-screen `short_name` (≤12 chars preferred). */
export function shortTenantName(name: string, max = 10): string {
  const trimmed = name.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

/** Apple + manifest metadata for staff/admin Add to Home Screen. */
export function staffPwaMetadata(tenant: Tenant): Metadata {
  const short = shortTenantName(tenant.name, 8)
  const title = `${short} Staff`
  return {
    applicationName: `${tenant.name} — Staff`,
    manifest: '/manifest-staff.json',
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: 'black-translucent',
    },
    icons: {
      apple: [{ url: '/icons/staff-180.png', sizes: '180x180', type: 'image/png' }],
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  }
}

export const staffPwaViewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: 'dark light',
}

/** Apple + manifest metadata for customer Add to Home Screen. */
export function customerPwaMetadata(tenant: Tenant): Metadata {
  const title = shortTenantName(tenant.name)
  return {
    applicationName: tenant.name,
    manifest: '/manifest-customer.json',
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: 'black-translucent',
    },
    icons: {
      apple: [
        { url: '/icons/customer-180.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  }
}

export const customerPwaViewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: 'light',
}

export function buildCustomerManifest(
  tenant: Tenant,
): MetadataRoute.Manifest {
  const short = shortTenantName(tenant.name)
  return {
    id: '/?source=pwa-customer',
    name: tenant.name,
    short_name: short,
    description: `Book lanes at ${tenant.name}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: PWA_CUSTOMER_BACKGROUND,
    theme_color: PWA_THEME_COLOR,
    icons: [
      {
        src: '/icons/customer-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/customer-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

export function buildStaffManifest(tenant: Tenant): MetadataRoute.Manifest {
  const short = shortTenantName(tenant.name, 8)
  return {
    id: '/staff?source=pwa-staff',
    name: `${tenant.name} — Staff`,
    short_name: `${short} Staff`,
    description: `${tenant.name} staff operations`,
    start_url: '/staff',
    // Entire origin so /admin and auth stay inside the installed staff app.
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: PWA_STAFF_BACKGROUND,
    theme_color: PWA_THEME_COLOR,
    icons: [
      {
        src: '/icons/staff-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/staff-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
