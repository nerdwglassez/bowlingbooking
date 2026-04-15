'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type RowAction = {
  key: string
  label: string
  onClick: () => void
  className?: string
}

type ManagementRowActionsMenuProps = {
  menuId: string
  triggerLabel: string
  actions: RowAction[]
  className?: string
  isOpen?: boolean
  onOpenChange?: (nextOpen: boolean) => void
}

export default function ManagementRowActionsMenu({
  menuId,
  triggerLabel,
  actions,
  className,
  isOpen,
  onOpenChange,
}: ManagementRowActionsMenuProps) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const scopedMenuAttr = useMemo(() => `row-actions-menu-${menuId}`, [menuId])
  const resolvedIsOpen = isOpen ?? uncontrolledIsOpen

  const setOpenState = useCallback((nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen)
      return
    }
    setUncontrolledIsOpen(nextOpen)
  }, [onOpenChange])

  useEffect(() => {
    if (!resolvedIsOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest(`[data-actions-menu-root="${scopedMenuAttr}"]`)) {
        setOpenState(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenState(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [resolvedIsOpen, scopedMenuAttr, setOpenState])

  const toggleOpen = (target: HTMLButtonElement | null) => {
    const rect = target?.getBoundingClientRect()
    const MENU_ESTIMATED_HEIGHT = 170
    const shouldOpenUpward = rect != null ? window.innerHeight - rect.bottom < MENU_ESTIMATED_HEIGHT : false

    if (resolvedIsOpen) {
      setOpenUpward(false)
      setOpenState(false)
      return
    }

    setOpenUpward(shouldOpenUpward)
    setOpenState(true)
  }

  if (actions.length === 0) return null

  return (
    <div className={cn('relative', className)} data-actions-menu-root={scopedMenuAttr}>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={resolvedIsOpen}
        aria-label={triggerLabel}
        variant="ghost"
        size="icon"
        rounded="full"
        className="border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        onClick={(event) => toggleOpen(event.currentTarget)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {resolvedIsOpen ? (
        <div
          role="menu"
          className={cn(
            'absolute left-0 z-20 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg',
            openUpward ? 'bottom-11' : 'top-11'
          )}
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              type="button"
              role="menuitem"
              variant="ghost"
              size="sm"
              rounded="xl"
              onClick={() => {
                setOpenState(false)
                action.onClick()
              }}
              className={cn(
                'h-auto w-full justify-start rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100',
                action.className
              )}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
