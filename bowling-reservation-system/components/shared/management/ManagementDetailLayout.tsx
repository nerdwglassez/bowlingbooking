import type { ReactNode } from 'react'
import { Card } from '@/components/shadcn/ui/card'
import { cn } from '@/lib/utils'

type ManagementDetailLayoutProps = {
  header: ReactNode
  children: ReactNode
  className?: string
}

export function ManagementDetailLayout({ header, children, className }: ManagementDetailLayoutProps) {
  return (
    <Card className={cn('rounded-2xl border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">{header}</div>
      {children}
    </Card>
  )
}

