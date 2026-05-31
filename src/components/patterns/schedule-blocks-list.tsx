'use client'

// ScheduleBlocksList — blocked times list view (upcoming + past).

import type { BlockedSlotRow } from '@/lib/actions/staff'
import {
  formatBlockListDate,
  formatBlockScopeBadge,
  formatLanePill,
} from '@/lib/schedule-display'

export type ScheduleBlocksListProps = {
  blocks: BlockedSlotRow[]
  canManageBlocks: boolean
  onSelectBlock?: (blockId: string) => void
}

function splitBlocks(blocks: BlockedSlotRow[]): {
  upcoming: BlockedSlotRow[]
  past: BlockedSlotRow[]
} {
  const now = Date.now()
  const upcoming: BlockedSlotRow[] = []
  const past: BlockedSlotRow[] = []
  for (const block of blocks) {
    if (block.endTime.getTime() < now) past.push(block)
    else upcoming.push(block)
  }
  return { upcoming, past }
}

export function ScheduleBlocksList({
  blocks,
  canManageBlocks,
  onSelectBlock,
}: ScheduleBlocksListProps) {
  const { upcoming, past } = splitBlocks(blocks)

  return (
    <div className="flex flex-col gap-4">
      <BlockSection
        label="Upcoming"
        blocks={upcoming}
        canManageBlocks={canManageBlocks}
        onSelectBlock={onSelectBlock}
      />
      <BlockSection
        label="Past"
        blocks={past}
        dimmed
        canManageBlocks={canManageBlocks}
        onSelectBlock={onSelectBlock}
      />
    </div>
  )
}

function BlockSection({
  label,
  blocks,
  dimmed = false,
  canManageBlocks,
  onSelectBlock,
}: {
  label: string
  blocks: BlockedSlotRow[]
  dimmed?: boolean
  canManageBlocks: boolean
  onSelectBlock?: (blockId: string) => void
}) {
  if (blocks.length === 0) return null

  return (
    <section className={dimmed ? 'opacity-45' : undefined}>
      <h2 className="px-1 pb-2 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </h2>
      <ul className="flex flex-col gap-2">
        {blocks.map((block) => {
          const allLanes = block.lanes.length === 0
          const content = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                    {block.reason ?? 'Lane block'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                    {formatBlockListDate(block)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-[var(--radius-full)] border border-solid px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    allLanes
                      ? 'border-[color-mix(in_srgb,var(--status-error-border)_35%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_15%,transparent)] text-[var(--status-error-text)]'
                      : 'border-[var(--color-border)] bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  {formatBlockScopeBadge(block.lanes)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-[var(--radius-full)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_15%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_6%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--status-error-text)]">
                  {allLanes
                    ? 'Whole venue closed'
                    : formatLanePill(block.lanes)}
                </span>
                <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                  One time
                </span>
              </div>
            </>
          )

          return (
            <li key={block.id}>
              {canManageBlocks && onSelectBlock ? (
                <button
                  type="button"
                  className="w-full rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_20%,transparent)] bg-[var(--surface-elevated)] p-3.5 text-left"
                  onClick={() => onSelectBlock(block.id)}
                >
                  {content}
                </button>
              ) : (
                <div className="rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_20%,transparent)] bg-[var(--surface-elevated)] p-3.5">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
