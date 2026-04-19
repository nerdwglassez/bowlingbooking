import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type CenterStateProps = {
  title: string
  description?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
}

export function LoadingBlock({ text = 'Loading...', className }: { text?: string; className?: string }) {
  return <div className={cn('p-6 text-center text-sm text-slate-500', className)}>{text}</div>
}

export function ErrorBlock({ message, className, action }: { message: string; className?: string; action?: ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700', className)}>
      <p>{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function EmptyCardBlock({ title, description, action, className }: CenterStateProps) {
  return (
    <div className={cn('rounded-lg bg-white p-8 text-center shadow-md', className)}>
      <p className="mb-2 text-base font-medium text-gray-700">{title}</p>
      {description ? <p className="mb-4 text-sm text-gray-600">{description}</p> : null}
      {action}
    </div>
  )
}

export function EmptySearchBlock({ title, description, className }: Omit<CenterStateProps, 'action'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-10 text-center text-slate-500', className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-300/80 text-slate-400">
        <Search className="h-5 w-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description ? <p className="text-sm">{description}</p> : null}
    </div>
  )
}

// Backward-compatible aliases used by extracted pages.
export const LoadingState = LoadingBlock
export const LoadingStateBlock = LoadingBlock
export const AppLoadingState = LoadingBlock
export const PageLoadingState = LoadingBlock

export const ErrorState = ErrorBlock

export function EmptyState({
  children,
  className,
  message,
  textClassName,
}: {
  children?: ReactNode
  className?: string
  message?: string
  textClassName?: string
}) {
  return (
    <div className={cn('rounded-lg bg-white p-8 text-center shadow-md', className)}>
      {message ? <p className={cn('text-gray-600', textClassName)}>{message}</p> : null}
      {children}
    </div>
  )
}

export function EmptyStateCard({
  title = 'No results',
  description,
  action,
  children,
  className,
  message,
  icon,
  containerClassName,
}: CenterStateProps & {
  message?: string
  icon?: ReactNode
  containerClassName?: string
}) {
  return (
    <div className={cn('rounded-lg bg-white p-8 text-center shadow-md', containerClassName, className)}>
      {icon ? (
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-300/80 text-slate-400">
          {icon}
        </span>
      ) : null}
      <p className="mb-2 text-base font-medium text-gray-700">{message ?? title}</p>
      {description ? <p className="mb-4 text-sm text-gray-600">{description}</p> : null}
      {action}
      {children}
    </div>
  )
}

export const PageEmptyState = EmptyStateCard
export const AppEmptyState = EmptyStateCard

export function PageNotFoundState({
  message = 'Not found',
  action,
}: {
  message?: string
  action?: ReactNode
}) {
  return <EmptyStateCard title={message} action={action} />
}

