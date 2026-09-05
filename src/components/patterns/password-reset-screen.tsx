'use client'

import type { FC, ReactNode } from 'react'
import { ArrowLeft } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon'

export type PasswordResetScreenProps = {
  icon: FC<{ className?: string }>
  title: string
  description: ReactNode
  children?: ReactNode
  signInHref: string
}

/**
 * Centered Untitled forgot-password / reset-password chrome (FIGMA.md).
 * Dummy sidebar stepper, Untitled logo, and carousel are omitted.
 */
export function PasswordResetScreen({
  icon,
  title,
  description,
  children,
  signInHref,
}: PasswordResetScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-primary px-4 py-12 lg:px-8 lg:pt-24 lg:pb-12">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6">
          <FeaturedIcon icon={icon} color="gray" theme="modern" size="lg" />
          <div className="flex w-full flex-col gap-2 text-center lg:gap-3">
            <h1 className="text-xl font-semibold text-primary lg:text-display-xs">
              {title}
            </h1>
            <div className="text-md text-tertiary">{description}</div>
          </div>
        </div>
        {children}
        <Button
          href={signInHref}
          color="link-gray"
          size="md"
          iconLeading={ArrowLeft}
        >
          Back to log in
        </Button>
      </div>
    </div>
  )
}
