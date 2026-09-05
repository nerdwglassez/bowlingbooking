'use client'

// BottomSheet — overlay chrome.
// Staff default (`placement="end"`) is the Untitled slideout: full-height,
// docked to the right, horizontal enter/exit only. Customer dashboard
// uses `placement="bottom"`. Do not combine from-bottom + from-right —
// both transforms apply and the panel moves diagonally.

import { Dialog as AriaDialog, Modal as AriaModal, ModalOverlay as AriaModalOverlay } from 'react-aria-components'

import { CloseButton } from '@/components/base/buttons/close-button'
import { cx } from '@/lib/cx'

export type BottomSheetPlacement = 'end' | 'bottom'

export type BottomSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Raise above other sheets when stacked (e.g. invite link over member detail). */
  elevated?: boolean
  /**
   * `end` — Untitled right slideout (staff), all breakpoints.
   * `bottom` — customer bottom sheet.
   */
  placement?: BottomSheetPlacement
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
  elevated = false,
  placement = 'end',
}: BottomSheetProps) {
  const isEnd = placement === 'end'

  return (
    <AriaModalOverlay
      isOpen={open}
      isDismissable
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      className={(state) =>
        cx(
          'fixed inset-0 flex min-h-dvh w-full overflow-hidden bg-overlay/70 outline-hidden backdrop-blur-[6px]',
          isEnd ? 'items-stretch justify-end' : 'items-end justify-center',
          elevated ? 'z-[60]' : 'z-50',
          state.isEntering && 'duration-300 ease-out animate-in fade-in',
          state.isExiting && 'duration-200 ease-in animate-out fade-out',
        )
      }
    >
      <AriaModal
        className={(state) =>
          cx(
            'flex flex-col bg-primary shadow-xl outline-hidden',
            isEnd
              ? 'h-full w-[calc(100%-1.5rem)] max-w-[400px] rounded-none border-l border-secondary'
              : 'w-full max-w-lg max-h-[min(88dvh,720px)] rounded-t-xl',
            state.isEntering &&
              cx(
                'duration-300 ease-out animate-in motion-reduce:animate-none',
                isEnd ? 'slide-in-from-right' : 'slide-in-from-bottom',
              ),
            state.isExiting &&
              cx(
                'duration-200 ease-in animate-out motion-reduce:animate-none',
                isEnd ? 'slide-out-to-right' : 'slide-out-to-bottom',
              ),
          )
        }
      >
        <AriaDialog
          className={cx(
            'flex h-full max-h-[inherit] flex-col gap-4 overflow-y-auto outline-hidden',
            isEnd ? 'px-4 py-6 lg:p-6' : 'p-5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              className={cx(
                'font-semibold text-primary',
                isEnd ? 'text-md lg:text-lg' : 'text-lg',
              )}
            >
              {title}
            </h2>
            <CloseButton onPress={onClose} label="Close" size={isEnd ? 'md' : 'sm'} />
          </div>
          {children}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  )
}
