import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { resetPasswordSchema } from '@/lib/validations'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const limiter = checkRateLimit(rateLimitKey(request, 'reset-password'), 10, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link, or password does not meet requirements.' },
        { status: 400 }
      )
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: parsed.data.token },
      include: { user: true },
    })

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(parsed.data.password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: record.id },
      }),
    ])

    return NextResponse.json({ message: 'Password has been reset. You can sign in now.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
