import type { ReportsKpi } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'
import { Card, CardBody } from '@/components/ui/card'

export function KpiTiles({ kpi }: { kpi: ReportsKpi }) {
  const items: Array<{ label: string; value: string; hint?: string }> = [
    { label: 'Gross revenue', value: formatPrice(kpi.grossRevenueCents) },
    { label: 'Bookings', value: String(kpi.bookingCount) },
    { label: 'Refunds (gross)', value: formatPrice(kpi.refundTotalCents) },
    {
      label: 'Avg booking value',
      value: formatPrice(kpi.averageBookingCents),
      hint: 'Paid CONFIRMED/COMPLETED only',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="flat">
          <CardBody className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {item.label}
            </span>
            <span className="text-xl font-medium text-[var(--color-text)]">
              {item.value}
            </span>
            {item.hint ? (
              <span className="text-xs text-[var(--color-text-muted)]">
                {item.hint}
              </span>
            ) : null}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
