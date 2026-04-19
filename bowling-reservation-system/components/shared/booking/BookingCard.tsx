import type { ReactNode } from 'react'
import { Card } from '@/components/shadcn/ui/card'
import { cn } from '@/lib/utils'

type BookingCardProps = {
  children: ReactNode
  className?: string
}

export default function BookingCard({ children, className }: BookingCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl border border-[#E2E8F0] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06),0px_1px_3px_0px_rgba(0,0,0,0.1)]',
        className
      )}
    >
      {children}
    </Card>
  )
}
