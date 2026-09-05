'use client'

import { Download01 } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { ReportsMetricDelta } from '@/components/patterns/reports-metric-delta'
import { ReportsRevenueChart } from '@/components/patterns/reports-revenue-chart'
import { cx } from '@/lib/cx'
import {
  analyticsExportLabel,
  downloadCsv,
  exportAnalyticsCsv,
  formatMetricMoney,
  type StaffAnalyticsSummary,
} from '@/lib/reports-display'

export type ReportsAnalyticsViewProps = {
  summary: StaffAnalyticsSummary
}

const PKG_DOT = [
  'bg-brand-solid',
  'bg-success-solid',
  'bg-warning-solid',
  'bg-error-solid',
] as const

const CARD =
  'flex flex-col gap-5 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset md:px-5'

export function ReportsAnalyticsView({ summary }: ReportsAnalyticsViewProps) {
  const maxPkgRevenue = Math.max(
    ...summary.packages.map((p) => p.revenueCents),
    1,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className={cx(CARD, 'min-w-0 flex-1')}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-tertiary">Revenue</p>
            <p className="text-display-sm font-semibold text-primary">
              {formatMetricMoney(summary.revenueCents)}
            </p>
            <ReportsMetricDelta delta={summary.revenueDelta} showLabel />
          </div>
          <ReportsRevenueChart summary={summary} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-6">
          <div className={CARD}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-tertiary">Bookings</p>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="text-display-sm font-semibold text-primary">
                {summary.bookingCount}
              </p>
              <ReportsMetricDelta delta={summary.bookingsDelta} />
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-tertiary">Avg value</p>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="text-display-sm font-semibold text-primary">
                {formatMetricMoney(summary.avgValueCents)}
              </p>
              <ReportsMetricDelta delta={summary.avgValueDelta} />
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-tertiary">Busiest day</p>
            <div className="flex flex-col gap-3">
              <p className="text-display-sm font-semibold text-primary">
                {summary.busiestDay?.dayName ?? '—'}
              </p>
              {summary.busiestDay ? (
                <p className="text-sm font-medium text-tertiary">
                  {summary.busiestDay.peakWindow}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-tertiary">No-show rate</p>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <p className="text-display-sm font-semibold text-primary">
                {summary.noShowRate}%
              </p>
              <ReportsMetricDelta delta={summary.noShowDelta} invertColors />
            </div>
          </div>
        </div>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-secondary">
          Package breakdown
        </h2>
        {summary.packages.length === 0 ? (
          <p className="text-sm text-tertiary">
            No package revenue in this period.
          </p>
        ) : (
          summary.packages.map((pkg, index) => (
            <div
              key={pkg.packageId}
              className="flex items-center gap-3 border-b border-secondary py-2 last:border-0"
            >
              <span
                className={cx(
                  'size-2 shrink-0 rounded-full',
                  PKG_DOT[index % PKG_DOT.length],
                )}
              />
              <span className="flex-1 text-sm text-primary">
                {pkg.packageName}
              </span>
              <span className="mr-2 text-xs text-tertiary">
                {pkg.bookingCount}
              </span>
              <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-secondary">
                <div
                  className={cx(
                    'h-full rounded-full',
                    PKG_DOT[index % PKG_DOT.length],
                  )}
                  style={{
                    width: `${Math.round((pkg.revenueCents / maxPkgRevenue) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-brand-secondary">
                {formatMetricMoney(pkg.revenueCents)}
              </span>
            </div>
          ))
        )}
      </section>

      {summary.promoUsage.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-secondary">
            Promo code usage
          </h2>
          {summary.promoUsage.map((promo) => (
            <div
              key={promo.code}
              className="flex items-center gap-3 border-b border-secondary py-2 last:border-0"
            >
              <span className="flex-1 font-mono text-sm font-semibold text-primary">
                {promo.code}
              </span>
              <span className="text-xs text-tertiary">{promo.uses} uses</span>
              <span className="text-xs text-error-primary">
                −{formatMetricMoney(promo.savedCents)}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <Button
        type="button"
        color="secondary"
        iconLeading={Download01}
        onClick={() =>
          downloadCsv(
            `reports-${summary.period}.csv`,
            exportAnalyticsCsv(summary),
          )
        }
      >
        {analyticsExportLabel(summary.period)}
      </Button>
    </div>
  )
}
