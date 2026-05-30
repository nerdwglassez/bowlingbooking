'use client'

import type { ReactNode } from 'react'

import { ToastProvider } from './toast-provider'

export function BookingProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
