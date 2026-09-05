'use client'

// Staff mobile hamburger header — Untitled MobileNavigationHeader with
// venue name instead of the Untitled logo. Closes on route change.

import { useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu02, X as CloseIcon } from '@untitledui/icons'
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export function StaffMobileHeader({
  brand,
  children,
}: {
  brand: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locationKey = `${pathname}?${searchParams.toString()}`
  const [open, setOpen] = useState(false)
  const [openForLocation, setOpenForLocation] = useState(locationKey)

  if (openForLocation !== locationKey) {
    setOpenForLocation(locationKey)
    setOpen(false)
  }

  return (
    <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
      <header className="flex h-16 items-center justify-between border-b border-secondary bg-primary px-4 lg:hidden">
        <div className="min-w-0">{brand}</div>
        <AriaButton
          aria-label="Open navigation"
          className="group flex items-center justify-center rounded-lg bg-primary p-2 text-fg-secondary outline-focus-ring hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Menu02 className="size-6 transition duration-200 ease-in-out group-aria-expanded:opacity-0" />
          <CloseIcon className="absolute size-6 opacity-0 transition duration-200 ease-in-out group-aria-expanded:opacity-100" />
        </AriaButton>
      </header>

      <AriaModalOverlay
        isDismissable
        className={({ isEntering, isExiting }) =>
          cx(
            'fixed inset-0 z-50 cursor-pointer bg-overlay/70 pr-16 backdrop-blur-md lg:hidden',
            isEntering && 'duration-300 ease-in-out animate-in fade-in',
            isExiting && 'duration-200 ease-in-out animate-out fade-out',
          )
        }
      >
        {({ state }) => (
          <>
            <AriaButton
              aria-label="Close navigation"
              onPress={() => state.close()}
              className="fixed top-3 right-3 flex cursor-pointer items-center justify-center rounded-lg p-2 text-fg-white/70 outline-focus-ring hover:bg-white/10 hover:text-fg-white focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <CloseIcon className="size-6" />
            </AriaButton>
            <AriaModal className="w-full max-w-74 cursor-auto will-change-transform">
              <AriaDialog className="h-dvh outline-hidden focus:outline-hidden">
                {open ? children : null}
              </AriaDialog>
            </AriaModal>
          </>
        )}
      </AriaModalOverlay>
    </AriaDialogTrigger>
  )
}
