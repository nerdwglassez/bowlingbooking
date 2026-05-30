import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { formatPrice } from '@/lib/pricing'
import type { LineItem } from '@/types'

function formatLaneLabel(count: number, numbers: number[] | undefined): string {
  if (numbers && numbers.length > 0) {
    return `Lanes ${numbers.join(', ')}`
  }
  return count === 1 ? '1 lane' : `${count} lanes`
}

export type BookingSummaryCardProps = {
  dateLabel: string
  timeLabel: string
  bowlerCount: number
  laneCount: number
  laneNumbers?: number[]
  packageName: string
  totalAmount: number
  lineItems?: LineItem[]
  className?: string
}

export function BookingSummaryCard({
  dateLabel,
  timeLabel,
  bowlerCount,
  laneCount,
  laneNumbers,
  packageName,
  totalAmount,
  lineItems,
  className,
}: BookingSummaryCardProps) {
  return (
    <Card variant="default" className={className}>
      <CardHeader>
        <h3 className="text-lg font-semibold">{dateLabel}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{timeLabel}</p>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-[var(--color-text-secondary)]">Bowlers</dt>
          <dd>{bowlerCount}</dd>
          <dt className="text-[var(--color-text-secondary)]">Lanes</dt>
          <dd>{formatLaneLabel(laneCount, laneNumbers)}</dd>
          <dt className="text-[var(--color-text-secondary)]">Package</dt>
          <dd>{packageName}</dd>
        </dl>
        {lineItems != null && lineItems.length > 0 ? (
          <div className="space-y-1.5 border-t border-[var(--color-border)] pt-3">
            {lineItems.map((item, index) => (
              <div
                key={`${item.type}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--color-text-secondary)]">
                  {item.label}
                </span>
                <span>{formatPrice(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>
      <CardFooter className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <span className="text-sm font-medium">Total</span>
        <span className="text-xl font-semibold">{formatPrice(totalAmount)}</span>
      </CardFooter>
    </Card>
  )
}
