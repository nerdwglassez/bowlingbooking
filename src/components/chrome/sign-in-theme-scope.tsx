'use client'

import { useLayoutEffect, type ReactNode } from 'react'

/**
 * Login is a shared staff/customer surface. Force Untitled purple on light
 * so the Figma split login matches, without following the staff device scheme.
 */
export function SignInThemeScope({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const html = document.documentElement
    const previousTheme = html.getAttribute('data-theme')
    const previousApp = html.getAttribute('data-app')
    html.setAttribute('data-theme', 'light')
    html.setAttribute('data-app', 'staff')

    return () => {
      if (previousTheme != null) html.setAttribute('data-theme', previousTheme)
      else html.removeAttribute('data-theme')
      if (previousApp != null) html.setAttribute('data-app', previousApp)
      else html.removeAttribute('data-app')
    }
  }, [])

  return (
    <div data-theme="light" data-app="staff" className="min-h-dvh bg-primary">
      {children}
    </div>
  )
}
