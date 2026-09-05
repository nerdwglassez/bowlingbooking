'use client'

import { useId } from 'react'
import { CalendarDate } from '@untitledui/icons'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartActiveDot,
  ChartLegendContent,
  ChartTooltipContent,
  chartAxisClassName,
  chartAxisTick,
} from '@/components/application/charts/charts-base'
import { EmptyState } from '@/components/application/empty-state/empty-state'
import type { CockpitHourlyPoint } from '@/lib/cockpit-display'

export function CockpitOccupancyChart({
  points,
}: {
  points: CockpitHourlyPoint[]
}) {
  const gradientId = useId()
  const hasData = points.some((point) => point.count > 0)

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset md:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-primary">
            Remaining-day occupancy
          </h2>
          <p className="text-sm text-tertiary">
            Bookings overlapping each hour from now through close.
          </p>
        </div>
        {hasData ? (
          <ChartLegendContent
            payload={[
              {
                value: 'Bookings',
                payload: { className: 'text-fg-brand-primary' },
              },
            ]}
            align="right"
            layout="horizontal"
          />
        ) : null}
      </div>

      {hasData ? (
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="currentColor"
                    className="text-fg-brand-primary"
                    stopOpacity={0.24}
                  />
                  <stop
                    offset="95%"
                    stopColor="currentColor"
                    className="text-fg-brand-primary"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                className="stroke-border-secondary"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tick={chartAxisTick}
                className={chartAxisClassName}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={chartAxisTick}
                className={chartAxisClassName}
              />
              <Tooltip
                cursor={{ className: 'fill-utility-brand-500/10' }}
                content={<ChartTooltipContent />}
              />
              <Area
                isAnimationActive={false}
                dataKey="count"
                name="Bookings"
                type="monotone"
                className="text-fg-brand-primary"
                stroke="currentColor"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                activeDot={<ChartActiveDot />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState size="sm" className="py-6">
          <EmptyState.Header pattern="none">
            <EmptyState.FeaturedIcon
              icon={CalendarDate}
              color="gray"
              theme="modern"
            />
          </EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>No remaining bookings</EmptyState.Title>
            <EmptyState.Description>
              Nothing left on the board from now through close.
            </EmptyState.Description>
          </EmptyState.Content>
        </EmptyState>
      )}
    </section>
  )
}
