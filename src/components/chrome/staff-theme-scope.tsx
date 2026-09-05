'use client'

import { useLayoutEffect, useState, type ReactNode } from 'react'

import type { Theme } from '@/lib/theme'

const THEME_COOKIE = 'theme'
const THEME_MAX_AGE = 60 * 60 * 24 * 365

function themeFromDevice(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function persistThemeCookie(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${THEME_MAX_AGE}; SameSite=Lax`
}

/**
 * Staff/admin theme follows the device color scheme via `data-theme`.
 * Sets `data-app="staff"` so light staff uses Untitled purple, not amber.
 */
export function StaffThemeScope({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useLayoutEffect(() => {
    const html = document.documentElement
    const previousTheme = html.getAttribute('data-theme')
    const previousApp = html.getAttribute('data-app')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const next = themeFromDevice()
      setTheme(next)
      html.setAttribute('data-theme', next)
      html.setAttribute('data-app', 'staff')
      persistThemeCookie(next)
    }

    apply()
    mq.addEventListener('change', apply)

    return () => {
      mq.removeEventListener('change', apply)
      if (previousTheme != null) {
        html.setAttribute('data-theme', previousTheme)
      } else {
        html.removeAttribute('data-theme')
      }
      if (previousApp != null) {
        html.setAttribute('data-app', previousApp)
      } else {
        html.removeAttribute('data-app')
      }
    }
  }, [])

  return (
    <div data-theme={theme} data-app="staff" className="min-h-dvh">
      {children}
    </div>
  )
}
