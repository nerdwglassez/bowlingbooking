'use client'

import { LifeBuoy01 } from '@untitledui/icons'

import { EmptyState } from '@/components/application/empty-state/empty-state'

export function StaffSupportPanel() {
  return (
    <EmptyState size="md" className="py-16">
      <EmptyState.Header>
        <EmptyState.FeaturedIcon
          icon={LifeBuoy01}
          color="brand"
          theme="modern"
        />
      </EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>Coming soon</EmptyState.Title>
        <EmptyState.Description>
          Staff support tools will live here.
        </EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  )
}
