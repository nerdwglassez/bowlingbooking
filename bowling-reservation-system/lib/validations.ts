import { z } from 'zod'

// Registration validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type RegisterInput = z.infer<typeof registerSchema>

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

// Booking validation
export const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().min(60).max(180).refine(val => [60, 90, 120, 150, 180].includes(val), {
    message: 'Duration must be 60, 90, 120, 150, or 180 minutes',
  }),
  lane: z.number().min(1).max(20).optional(),
  numBowlers: z.number().min(1).max(10),
  shoeSizes: z.array(z.number().min(1).max(15)).optional(),
  packageIds: z.array(z.string()).optional(),
})

export type BookingInput = z.infer<typeof bookingSchema>
