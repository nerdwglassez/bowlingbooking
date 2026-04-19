import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BookingLineItemsSummaryProps = {
  totalLabel: string
  totalValue: number
  actionSlot?: ReactNode
  className?: string
}

export default function BookingLineItemsSummary({
  totalLabel,
  totalValue,
  actionSlot,
  className,
}: BookingLineItemsSummaryProps) {
  return (
    <div className={cn('border-t pt-6', className)}>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-600">{totalLabel}</p>
          <p className="text-2xl font-bold">${Number(totalValue).toFixed(2)}</p>
        </div>
        {actionSlot ? <div className="flex items-center gap-2 flex-wrap no-print">{actionSlot}</div> : null}
      </div>
    </div>
  )
}
