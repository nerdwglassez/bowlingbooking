'use client'

import { Key01 } from '@untitledui/icons'

import { Button } from '@/components/base/buttons/button'
import { PasswordResetScreen } from '@/components/patterns/password-reset-screen'

export function InvalidResetLink() {
  return (
    <PasswordResetScreen
      icon={Key01}
      title="Set new password"
      description="This reset link is invalid. Request a new one to continue."
      signInHref="/signin"
    >
      <Button href="/forgot-password" color="primary" size="lg" className="w-full">
        Request a new link
      </Button>
    </PasswordResetScreen>
  )
}
