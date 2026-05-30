'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { formatPrice } from '@/lib/pricing'
import type { LineItem } from '@/types'

export type OrderSummaryCardProps = {
  totalCents: number
  lineItems: LineItem[]
  promoLine?: { code: string; discountCents: number } | null
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  /** Promo entry or other controls shown when expanded. */
  expandedFooter?: ReactNode
  title?: string
  className?: string
}

export function OrderSummaryCard({
  totalCents,
  lineItems,
  promoLine,
  expanded,
  onExpandedChange,
  expandedFooter,
  title = 'Order summary',
  className,
}: OrderSummaryCardProps) {
  const hasPromo =
    promoLine != null && promoLine.discountCents > 0

  return (
    <div
      className={[
        'overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-card)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-[15px] py-[13px] text-left"
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm" aria-hidden>
            🎳
          </span>
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
            {title}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="text-[15px] text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {formatPrice(totalCents)}
          </span>
          <ChevronDown
            className={[
              'size-3.5 text-[var(--color-text-muted)] transition-transform',
              expanded ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden
          />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--color-border-subtle)] px-[15px] pb-[13px]">
          {lineItems.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              className="flex items-center justify-between border-b border-[var(--color-border-subtle)] py-[7px] last:border-b-0"
            >
              <span className="text-xs text-[var(--color-text-secondary)]">
                {item.label}
              </span>
              <span className="text-xs font-medium text-[var(--color-text-primary)]">
                {item.amount === 0 && item.type === 'shoe'
                  ? 'Included'
                  : formatPrice(item.amount)}
              </span>
            </div>
          ))}

          {hasPromo ? (
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] py-[7px]">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Promo code · {promoLine!.code.toUpperCase()}
              </span>
              <span className="text-xs font-medium text-[var(--status-ok-text)]">
                {formatPrice(-promoLine!.discountCents)}
              </span>
            </div>
          ) : null}

          {expandedFooter}

          <div className="flex items-center justify-between pt-2.5">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              Total
            </span>
            <span
              className="text-[17px] text-[var(--color-text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {formatPrice(totalCents)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
