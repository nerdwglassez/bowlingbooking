import type { CSSProperties, ReactNode } from 'react'
import { Card } from '@/components/shadcn/ui/card'
import { cn } from '@/lib/utils'

type ManagementPanelProps = {
  children: ReactNode
  className?: string
}

type ManagementPanelHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

type ManagementPanelBodyProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

type ManagementSectionProps = {
  title: ReactNode
  children: ReactNode
  className?: string
}

export function ManagementPanel({ children, className }: ManagementPanelProps) {
  return <Card className={cn('overflow-visible rounded-2xl border-slate-200 bg-white shadow-sm', className)}>{children}</Card>
}

export function ManagementPanelHeader({
  title,
  description,
  actions,
  className,
}: ManagementPanelHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">{actions}</div> : null}
    </div>
  )
}

export function ManagementPanelBody({ children, className, style }: ManagementPanelBodyProps) {
  return (
    <div className={cn('p-5', className)} style={style}>
      {children}
    </div>
  )
}

export function ManagementSection({ title, children, className }: ManagementSectionProps) {
  return (
    <section className={className}>
      <h2 className="mb-2 font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}
