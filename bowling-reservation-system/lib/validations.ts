import { z } from 'zod'
import { PASSWORD_MAX_LENGTH } from './passwordRequirements'

const sanitizeString = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, '').trim()
const noControlChars = (s: string) => !/[\x00-\x1F\x7F]/.test(s)

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine(noControlChars, 'Password contains invalid characters')
  .refine((s) => s.length >= 8, 'Password must be at least 8 characters')
  .refine((s) => /[A-Z]/.test(s), 'Password must contain at least one uppercase letter')
  .refine((s) => /[a-z]/.test(s), 'Password must contain at least one lowercase letter')
  .refine((s) => /[0-9]/.test(s), 'Password must contain at least one number')

// Registration validation
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255).transform(sanitizeString),
  password: passwordSchema,
  firstName: z.string().max(100).transform((s) => (s?.trim() ?? '')).optional(),
  lastName: z.string().max(100).transform((s) => (s?.trim() ?? '')).optional(),
  phone: z
    .string()
    .max(30)
    .transform((s) => s?.trim() ?? '')
    .optional()
    .refine((s) => !s || s.length >= 10, 'Phone must be at least 10 digits'),
})

export type RegisterInput = z.infer<typeof registerSchema>

// Profile update (empty string = clear field)
export const profileUpdateSchema = z.object({
  firstName: z.string().max(100).transform((s) => s?.trim() ?? null).optional(),
  lastName: z.string().max(100).transform((s) => s?.trim() ?? null).optional(),
  phone: z.string().max(30).transform((s) => s?.trim() ?? null).optional(),
  email: z.string().email().max(255).transform((s) => (s ? sanitizeString(s) : undefined)).optional(),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// Change password (when logged in)
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(PASSWORD_MAX_LENGTH).refine(noControlChars, 'Invalid characters'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// Forgot password (request reset)
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(255).transform(sanitizeString),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// Reset password (with token from email)
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Invalid or expired reset link').max(500),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255).transform(sanitizeString),
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH).refine(noControlChars, 'Invalid characters'),
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
  numLanes: z.number().min(1).max(5).optional(), // default 1 for single-lane
  numBowlers: z.number().min(1).max(10),
  shoeSizes: z.array(z.number().min(1).max(15)).optional(),
  packageIds: z.array(z.string()).optional(),
  productItems: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1).max(10),
  })).optional(),
})

export type BookingInput = z.infer<typeof bookingSchema>

// Booking creation (includes terms acceptance and optional loyalty redemption)
export const bookingCreateSchema = bookingSchema.extend({
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and conditions' }) }),
  loyaltyPointsToRedeem: z.number().int().min(0).optional(),
  giftCardCode: z.string().max(50).optional(),
  giftCardAmountToApply: z.number().min(0).optional(),
  /** Promo / corporate code (server-validated). */
  discountCode: z.string().max(40).optional(),
})

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>
