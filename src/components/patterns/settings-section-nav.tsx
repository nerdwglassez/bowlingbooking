'use client'

import type { Key } from 'react-aria-components'

import { Tabs } from '@/components/application/tabs/tabs'
import { Select } from '@/components/base/select/select'
import { cx } from '@/lib/cx'
import type { SettingsSectionItem } from '@/lib/staff-nav'

export const SETTINGS_SIGN_OUT_KEY = 'sign-out'

export interface SettingsSectionNavProps {
  sections: SettingsSectionItem[]
  selectedHref: string
  onSelect: (href: string) => void
  onSignOut?: () => void
  /** Mount the mobile Select after hydration (Untitled Select mismatches SSR). */
  showMobileSelect?: boolean
  className?: string
}

export function SettingsSectionNav({
  sections,
  selectedHref,
  onSelect,
  onSignOut,
  showMobileSelect = false,
  className,
}: SettingsSectionNavProps) {
  const selectItems = [
    ...sections.map((item) => ({ id: item.href, label: item.label })),
    ...(onSignOut ? [{ id: SETTINGS_SIGN_OUT_KEY, label: 'Sign out' }] : []),
  ]

  function handleSelect(key: Key | null) {
    if (key == null) return
    const id = String(key)
    if (id === SETTINGS_SIGN_OUT_KEY) {
      onSignOut?.()
      return
    }
    if (id === selectedHref) return
    onSelect(id)
  }

  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <Tabs
        selectedKey={selectedHref}
        onSelectionChange={handleSelect}
        className="hidden min-w-0 lg:flex"
        aria-label="Settings sections"
      >
        <Tabs.List
          type="underline"
          size="sm"
          className="w-full max-w-full min-w-0 overflow-x-auto"
        >
          {sections.map((item) => (
            <Tabs.Item key={item.href} id={item.href}>
              {item.label}
            </Tabs.Item>
          ))}
        </Tabs.List>
      </Tabs>

      {showMobileSelect ? (
        <Select
          selectedKey={selectedHref}
          onSelectionChange={handleSelect}
          aria-label="Settings section"
          items={selectItems}
          placeholder={
            sections.find((item) => item.href === selectedHref)?.label ??
            'Profile'
          }
          className="w-full"
        >
          {(item) => <Select.Item id={item.id} label={item.label} />}
        </Select>
      ) : null}
    </div>
  )
}
