'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const guestSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number is required'),
})

type GuestFormData = z.infer<typeof guestSchema>

interface GuestCheckoutProps {
  onGuestSubmit: (data: GuestFormData) => void
  onLoginClick?: () => void
  isLoading?: boolean
}

export default function GuestCheckout({ onGuestSubmit, isLoading }: GuestCheckoutProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    mode: 'onChange',
  })

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <form onSubmit={handleSubmit(onGuestSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="(555) 123-4567"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <p className="text-sm text-gray-600">
            We&apos;ll create an account for you so you can manage your booking. You can set a password later.
          </p>

          <Button type="submit" isLoading={isLoading} disabled={!isValid || isLoading} className="w-full">
            Continue as Guest
          </Button>
        </form>
      </div>
    </div>
  )
}

