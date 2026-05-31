import Link from 'next/link'

import { Button } from '@/components/ui/button'

export interface SettingsSubpageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
}

export function SettingsSubpageHeader({
  title,
  subtitle,
  backHref = '/staff/settings',
  backLabel = 'Settings',
}: SettingsSubpageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 px-1">
        <Link href={backHref}>
          <span aria-hidden>‹</span>
          {backLabel}
        </Link>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="[font-family:var(--font-display)] text-[22px] text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  )
}

export function SettingsSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 pt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
      {children}
    </h2>
  )
}
