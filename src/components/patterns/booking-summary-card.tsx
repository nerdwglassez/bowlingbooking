import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { formatPrice } from '@/lib/pricing'

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
  className,
}: BookingSummaryCardProps) {
  return (
    <Card variant="default" className={className}>
      <CardHeader>
        <h3 className="text-lg font-semibold">{dateLabel}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{timeLabel}</p>
      </CardHeader>
      <CardBody>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-[var(--color-text-secondary)]">Bowlers</dt>
          <dd>{bowlerCount}</dd>
          <dt className="text-[var(--color-text-secondary)]">Lanes</dt>
          <dd>{formatLaneLabel(laneCount, laneNumbers)}</dd>
          <dt className="text-[var(--color-text-secondary)]">Package</dt>
          <dd>{packageName}</dd>
        </dl>
      </CardBody>
      <CardFooter className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <span className="text-sm font-medium">Total</span>
        <span className="text-xl font-semibold">{formatPrice(totalAmount)}</span>
      </CardFooter>
    </Card>
  )
}
