import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { forgotPasswordSchema } from '@/lib/validations'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const limiter = checkRateLimit(rateLimitKey(request, 'forgot-password'), 5, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    })

    // Always return 200 so we don't leak whether the email exists
    if (!user) {
      return NextResponse.json({ message: 'If that email is registered, we sent a reset link.' })
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const resetLink = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`
    await sendPasswordResetEmail(user.email, resetLink)

    return NextResponse.json({ message: 'If that email is registered, we sent a reset link.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
