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
  onLoginClick: () => void
  isLoading?: boolean
}

export default function GuestCheckout({ onGuestSubmit, onLoginClick, isLoading }: GuestCheckoutProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
  })

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Checkout Options</h3>
        
        <div className="mb-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onLoginClick}
            className="w-full"
          >
            Sign In to Existing Account
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue as guest</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onGuestSubmit)} className="mt-4 space-y-4">
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
            We'll create an account for you so you can manage your booking. You can set a password later.
          </p>

          <Button type="submit" isLoading={isLoading} className="w-full">
            Continue as Guest
          </Button>
        </form>
      </div>
    </div>
  )
}

