'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartActiveDot,
  ChartTooltipContent,
  chartAxisClassName,
  chartAxisTick,
} from '@/components/application/charts/charts-base'
import { formatMetricMoney, type StaffAnalyticsSummary } from '@/lib/reports-display'

export function ReportsRevenueChart({
  summary,
}: {
  summary: StaffAnalyticsSummary
}) {
  const data = summary.weeklyBars.map((bar) => ({
    label: bar.label,
    revenue: bar.revenueCents / 100,
  }))
  const hasData = data.some((point) => point.revenue > 0)

  if (!hasData) {
    return (
      <p className="text-sm text-tertiary">No revenue in this period.</p>
    )
  }

  return (
    <div className="h-[240px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid
            vertical={false}
            className="stroke-border-secondary"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={chartAxisTick}
            className={chartAxisClassName}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={chartAxisTick}
            className={chartAxisClassName}
            tickFormatter={(value) => formatMetricMoney(Math.round(Number(value) * 100))}
          />
          <Tooltip
            cursor={{ className: 'fill-utility-brand-500/10' }}
            content={<ChartTooltipContent formatter={(value) => formatMetricMoney(Math.round(Number(value) * 100))} />}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            className="fill-utility-brand-600"
            radius={[6, 6, 0, 0]}
            maxBarSize={32}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            className="stroke-fg-brand-primary"
            stroke="currentColor"
            strokeWidth={2}
            dot={false}
            activeDot={<ChartActiveDot />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
