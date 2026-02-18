import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

const guestRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
})

export async function POST(request: NextRequest) {
  try {
    const limiter = checkRateLimit(rateLimitKey(request, 'guest-register'), 10, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const validatedData = guestRegisterSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      )
    }

    // Create new user with random password (they can set it later)
    const randomPassword = crypto.randomUUID()
    const passwordHash = await hashPassword(randomPassword)
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        role: 'CUSTOMER',
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
      },
    })

    // Create session
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Guest register error:', error)
    return NextResponse.json(
      { error: 'Failed to create guest account' },
      { status: 500 }
    )
  }
}


