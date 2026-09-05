'use client'

// Signed-in staff card for the Untitled-shaped sidebar footer.
// Real user only — no placeholder accounts, ⌘K, or switch-account menu.

import { useState } from 'react'
import { ChevronSelectorVertical, LogOut01 } from '@untitledui/icons'
import { Button as AriaButton } from 'react-aria-components'

import { AvatarLabelGroup } from '@/components/base/avatar/avatar-label-group'
import { Dropdown } from '@/components/base/dropdown/dropdown'
import { SignOutConfirmSheet } from '@/components/chrome/sign-out-confirm-sheet'
import { formatStaffRole, staffNavInitials } from '@/lib/staff-nav'
import type { Role } from '@/types'

export function StaffNavAccountCard({
  name,
  email,
  role,
  venueName,
}: {
  name: string | null | undefined
  email: string | null | undefined
  role: Role
  venueName: string
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const title = name?.trim() || email || 'Signed in'
  const subtitle = email && name?.trim() ? email : formatStaffRole(role)

  return (
    <>
      <div className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
        <AvatarLabelGroup
          size="md"
          initials={staffNavInitials(name, email)}
          alt={title}
          title={title}
          subtitle={subtitle}
        />
        <Dropdown.Root>
          <AriaButton
            aria-label="Account menu"
            className="absolute top-2 right-2 flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronSelectorVertical className="size-4 shrink-0 stroke-[2.25px]" />
          </AriaButton>
          <Dropdown.Popover placement="top right" className="w-min">
            <Dropdown.Menu
              onAction={(key) => {
                if (key === 'sign-out') setConfirmOpen(true)
              }}
            >
              <Dropdown.Item id="sign-out" icon={LogOut01} label="Sign out" />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>
      <SignOutConfirmSheet
        venueName={venueName}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
