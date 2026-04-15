import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ManagementTableShellProps = {
  columns: ReactNode[]
  children: ReactNode
  className?: string
  headerClassName?: string
  gridClassName?: string
}

export function ManagementTableShell({
  columns,
  children,
  className,
  headerClassName,
  gridClassName = 'grid-cols-[180px_1fr_190px_220px_170px]',
}: ManagementTableShellProps) {
  return (
    <div className={className}>
      <div
        className={cn(
          'hidden bg-gradient-to-r from-slate-50 to-slate-100/60 px-6 py-4 text-sm font-semibold text-slate-500 md:grid',
          gridClassName,
          headerClassName
        )}
      >
        {columns.map((column, index) => (
          <span key={index}>{column}</span>
        ))}
      </div>
      <div>{children}</div>
    </div>
  )
}

type ManagementTableRowProps = {
  children: ReactNode
  index: number
  className?: string
}

export function ManagementTableRow({ children, index, className }: ManagementTableRowProps) {
  return (
    <div
      className={cn(
        'border-b border-slate-200/60 px-6 py-5',
        index % 2 === 0 ? 'bg-slate-50/40' : 'bg-white',
        className
      )}
    >
      {children}
    </div>
  )
}
