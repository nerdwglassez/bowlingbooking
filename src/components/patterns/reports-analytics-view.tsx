'use client'

import { Download } from 'lucide-react'

import { ReportsMetricDelta } from '@/components/patterns/reports-metric-delta'
import {
  analyticsExportLabel,
  downloadCsv,
  exportAnalyticsCsv,
  formatMetricMoney,
  packageAccentColor,
  type StaffAnalyticsSummary,
} from '@/lib/reports-display'

export type ReportsAnalyticsViewProps = {
  summary: StaffAnalyticsSummary
}

function MiniBarChart({ summary }: { summary: StaffAnalyticsSummary }) {
  const max = Math.max(...summary.weeklyBars.map((b) => b.revenueCents), 1)

  return (
    <div className="mt-3">
      <div className="flex h-9 items-end gap-0.5">
        {summary.weeklyBars.map((bar) => {
          const heightPct = Math.max(3, Math.round((bar.revenueCents / max) * 100))
          return (
            <div
              key={bar.label}
              className="flex flex-1 flex-col items-center gap-0.5"
            >
              <div
                className={`w-full rounded-t-[2px] ${
                  bar.highlight
                    ? 'bg-[var(--color-action)]'
                    : 'bg-[var(--color-action-tint)]'
                }`}
                style={{ height: `${Math.max(3, heightPct * 0.36)}px` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-0.5 flex gap-0.5">
        {summary.weeklyBars.map((bar) => (
          <div
            key={`${bar.label}-lbl`}
            className="flex-1 text-center text-[8px] text-[var(--color-text-muted)]"
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportsAnalyticsView({ summary }: ReportsAnalyticsViewProps) {
  const maxPkgRevenue = Math.max(
    ...summary.packages.map((p) => p.revenueCents),
    1,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 rounded-[var(--radius-lg)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3.5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Revenue
          </div>
          <div className="font-[family-name:var(--font-display)] text-[26px] leading-none text-[var(--color-action-dark)]">
            {formatMetricMoney(summary.revenueCents)}
          </div>
          <ReportsMetricDelta delta={summary.revenueDelta} showLabel />
          <MiniBarChart summary={summary} />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3.5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Bookings
          </div>
          <div className="font-[family-name:var(--font-display)] text-[26px] leading-none text-[var(--color-text-primary)]">
            {summary.bookingCount}
          </div>
          <ReportsMetricDelta delta={summary.bookingsDelta} />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3.5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Avg value
          </div>
          <div className="font-[family-name:var(--font-display)] text-[22px] leading-none text-[var(--color-text-primary)]">
            {formatMetricMoney(summary.avgValueCents)}
          </div>
          <ReportsMetricDelta delta={summary.avgValueDelta} />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3.5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Busiest day
          </div>
          <div className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--color-text-primary)]">
            {summary.busiestDay?.dayName ?? '—'}
          </div>
          {summary.busiestDay ? (
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              {summary.busiestDay.peakWindow}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3.5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            No-show rate
          </div>
          <div className="font-[family-name:var(--font-display)] text-[22px] leading-none text-[var(--color-text-primary)]">
            {summary.noShowRate}%
          </div>
          <ReportsMetricDelta delta={summary.noShowDelta} invertColors />
        </div>
      </div>

      <div className="h-px bg-[var(--color-border)]" />

      <section className="flex flex-col gap-2">
        <h2 className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Package breakdown
        </h2>
        <div>
        {summary.packages.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">
            No package revenue in this period.
          </p>
        ) : (
          summary.packages.map((pkg, index) => (
            <div
              key={pkg.packageId}
              className="flex items-center gap-2.5 border-b border-solid border-[var(--color-border)] py-2 last:border-0"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: packageAccentColor(index) }}
              />
              <span className="flex-1 text-xs text-[var(--color-text-primary)]">
                {pkg.packageName}
              </span>
              <span className="mr-2 text-[11px] text-[var(--color-text-muted)]">
                {pkg.bookingCount}
              </span>
              <div className="h-1 w-[60px] overflow-hidden rounded-[2px] bg-[var(--color-border)]">
                <div
                  className="h-full rounded-[2px]"
                  style={{
                    width: `${Math.round((pkg.revenueCents / maxPkgRevenue) * 100)}%`,
                    backgroundColor: packageAccentColor(index),
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-[var(--color-action-dark)]">
                {formatMetricMoney(pkg.revenueCents)}
              </span>
            </div>
          ))
        )}
        </div>
      </section>

      {summary.promoUsage.length > 0 ? (
        <>
          <div className="h-px bg-[var(--color-border)]" />
          <section className="flex flex-col gap-2">
            <h2 className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Promo code usage
            </h2>
            <div>
            {summary.promoUsage.map((promo) => (
              <div
                key={promo.code}
                className="flex items-center gap-2.5 border-b border-solid border-[var(--color-border)] py-2 last:border-0"
              >
                <span className="flex-1 font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                  {promo.code}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {promo.uses} uses
                </span>
                <span className="text-[11px] text-[var(--status-error-text)]">
                  −{formatMetricMoney(promo.savedCents)}
                </span>
              </div>
            ))}
            </div>
          </section>
        </>
      ) : null}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-solid border-[var(--color-border-strong)] bg-transparent py-2.5 text-xs font-medium text-[var(--color-text-secondary)]"
        onClick={() =>
          downloadCsv(
            `reports-${summary.period}.csv`,
            exportAnalyticsCsv(summary),
          )
        }
      >
        <Download className="size-3.5" aria-hidden />
        {analyticsExportLabel(summary.period)}
      </button>
    </div>
  )
}
