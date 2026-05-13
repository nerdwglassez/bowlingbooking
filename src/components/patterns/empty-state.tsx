import * as React from 'react'
import { Card, CardBody } from '@/components/ui/card'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card variant="flat" className={className}>
      <CardBody className="flex flex-col items-center justify-center text-center gap-2 py-12">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-[var(--color-text-secondary)] max-w-sm">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </CardBody>
    </Card>
  )
}
