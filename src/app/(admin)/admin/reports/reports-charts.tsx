'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ReportsDailyPoint, ReportsTopPackage } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'
import {
  ChartActiveDot,
  ChartTooltipContent,
  chartAxisClassName,
  chartAxisTick,
} from '@/components/application/charts/charts-base'

interface Props {
  daily: ReportsDailyPoint[]
  topPackages: ReportsTopPackage[]
}

const CARD =
  'flex flex-col gap-5 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset md:px-5'

export function ReportsCharts({ daily, topPackages }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section className={CARD}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-tertiary">Revenue by day</h2>
          <p className="text-sm text-tertiary">
            Gross revenue from paid bookings (cents aggregated per UTC day in
            v1).
          </p>
        </div>
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid
                vertical={false}
                className="stroke-border-secondary"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="date"
                tick={chartAxisTick}
                className={chartAxisClassName}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={chartAxisTick}
                className={chartAxisClassName}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatPrice(Number(v))}
                width={72}
              />
              <Tooltip
                cursor={{ className: 'fill-utility-brand-500/10' }}
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatPrice(Number(value ?? 0))}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="revenueCents"
                name="Revenue"
                className="stroke-fg-brand-primary"
                stroke="currentColor"
                strokeWidth={2}
                dot={false}
                activeDot={<ChartActiveDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-tertiary">Bookings by day</h2>
          <p className="text-sm text-tertiary">
            Paid CONFIRMED and COMPLETED bookings per day.
          </p>
        </div>
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid
                vertical={false}
                className="stroke-border-secondary"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="date"
                tick={chartAxisTick}
                className={chartAxisClassName}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={chartAxisTick}
                className={chartAxisClassName}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ className: 'fill-utility-brand-500/10' }}
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="bookingCount"
                name="Bookings"
                className="fill-utility-brand-600"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-tertiary">Top packages</h2>
          <p className="text-sm text-tertiary">
            Top five by gross revenue in this window.
          </p>
        </div>
        {topPackages.length === 0 ? (
          <p className="text-sm text-tertiary">
            No package revenue in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary text-tertiary">
                  <th className="py-2 pr-4 font-medium">Package</th>
                  <th className="py-2 pr-4 font-medium">Bookings</th>
                  <th className="py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topPackages.map((row) => (
                  <tr
                    key={row.packageId}
                    className="border-b border-secondary last:border-0"
                  >
                    <td className="py-2 pr-4 text-primary">{row.packageName}</td>
                    <td className="py-2 pr-4 text-tertiary">{row.bookingCount}</td>
                    <td className="py-2 text-primary">
                      {formatPrice(row.revenueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
