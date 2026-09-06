'use client'

// BottomSheet — overlay chrome.
// Staff default (`placement="end"`) is the Untitled slideout: full-height,
// docked to the right, horizontal enter/exit only. Customer dashboard uses
// `placement="bottom"` with optional `desktopPlacement` so lg+ (1024px)
// matches CUSTOMER_DASHBOARD / staff responsive rules (center modal or
// 320px end panel). Do not combine from-bottom + from-right — both
// transforms apply and the panel moves diagonally.

import { useEffect, useState } from 'react'
import {
  Dialog as AriaDialog,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
} from 'react-aria-components'

import { CloseButton } from '@/components/base/buttons/close-button'
import { cx } from '@/lib/cx'

export type BottomSheetPlacement = 'end' | 'bottom'

/** lg+ adaptation when `placement="bottom"` (customer surfaces). */
export type BottomSheetDesktopPlacement = 'center' | 'end'

export type BottomSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Raise above other sheets when stacked (e.g. invite link over member detail). */
  elevated?: boolean
  /**
   * `end` — Untitled right slideout (staff), all breakpoints.
   * `bottom` — customer bottom sheet (mobile / default).
   */
  placement?: BottomSheetPlacement
  /**
   * When `placement="bottom"`, how the sheet adapts at `lg` (1024px+).
   * Cancel/reschedule → `center` (max 480px). Preferences → `end` (320px).
   * Omit on staff overlays (`placement="end"`).
   */
  desktopPlacement?: BottomSheetDesktopPlacement
}

type ResolvedPlacement = 'end' | 'bottom' | 'center'

/** Mobile-first: assume narrow until mounted so sheets don't flash desktop layout. */
function useIsLg(): boolean {
  const [isLg, setIsLg] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsLg(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isLg
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  elevated = false,
  placement = 'end',
  desktopPlacement,
}: BottomSheetProps) {
  const isLg = useIsLg()

  const resolved: ResolvedPlacement =
    placement === 'bottom' && isLg && desktopPlacement
      ? desktopPlacement
      : placement

  const isEnd = resolved === 'end'
  const isCenter = resolved === 'center'
  const isCustomerEnd =
    placement === 'bottom' && desktopPlacement === 'end' && isEnd

  return (
    <AriaModalOverlay
      isOpen={open}
      isDismissable
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      className={(state) =>
        cx(
          'fixed inset-0 flex min-h-dvh w-full overflow-hidden outline-hidden backdrop-blur-[6px]',
          isCenter ? 'bg-overlay/40' : 'bg-overlay/70',
          isEnd
            ? 'items-stretch justify-end'
            : isCenter
              ? 'items-center justify-center p-4'
              : 'items-end justify-center',
          elevated ? 'z-[60]' : 'z-50',
          state.isEntering &&
            'duration-300 ease-out animate-in fade-in motion-reduce:animate-none',
          state.isExiting &&
            'duration-200 ease-in animate-out fade-out motion-reduce:animate-none',
        )
      }
    >
      <AriaModal
        className={(state) =>
          cx(
            'flex flex-col bg-primary shadow-xl outline-hidden',
            isEnd
              ? cx(
                  'h-full w-[calc(100%-1.5rem)] rounded-none border-l border-secondary',
                  isCustomerEnd ? 'max-w-[320px]' : 'max-w-[400px]',
                )
              : isCenter
                ? 'w-full max-w-[480px] max-h-[min(88dvh,720px)] rounded-xl'
                : 'w-full max-w-lg max-h-[min(88dvh,720px)] rounded-t-xl',
            state.isEntering &&
              cx(
                'duration-300 ease-out animate-in motion-reduce:animate-none',
                isEnd
                  ? 'slide-in-from-right'
                  : isCenter
                    ? 'fade-in zoom-in-95'
                    : 'slide-in-from-bottom',
              ),
            state.isExiting &&
              cx(
                'duration-200 ease-in animate-out motion-reduce:animate-none',
                isEnd
                  ? 'slide-out-to-right'
                  : isCenter
                    ? 'fade-out zoom-out-95'
                    : 'slide-out-to-bottom',
              ),
          )
        }
      >
        <AriaDialog
          className={cx(
            'flex h-full max-h-[inherit] flex-col gap-4 overflow-y-auto outline-hidden',
            isEnd || isCenter ? 'px-4 py-6 lg:p-6' : 'p-5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              className={cx(
                'font-semibold text-primary',
                isEnd || isCenter ? 'text-md lg:text-lg' : 'text-lg',
              )}
            >
              {title}
            </h2>
            <CloseButton
              onPress={onClose}
              label="Close"
              size={placement === 'end' && !desktopPlacement ? 'md' : 'lg'}
            />
          </div>
          {children}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  )
}
