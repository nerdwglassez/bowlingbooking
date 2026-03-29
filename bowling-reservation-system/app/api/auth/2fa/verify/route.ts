import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyTotpToken } from '@/lib/totp'
import { createSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import { setSessionTokenCookie } from '@/lib/session-cookie'
import { z } from 'zod'

const bodySchema = z.object({
  tempToken: z.string().min(1, 'Missing verification token'),
  code: z.string().length(6, 'Code must be 6 digits'),
})

/** POST: Verify TOTP code after password login; creates session. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { tempToken, code } = parsed.data

    const temp = await prisma.twoFactorTempToken.findUnique({
      where: { token: tempToken },
      include: { user: true },
    })

    if (!temp || temp.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification expired. Please log in again.' },
        { status: 400 }
      )
    }

    if (!temp.user.totpEnabled || !temp.user.totpSecret) {
      await prisma.twoFactorTempToken.delete({ where: { id: temp.id } })
      return NextResponse.json(
        { error: 'Two-factor is not enabled for this account.' },
        { status: 400 }
      )
    }

    const valid = verifyTotpToken(temp.user.totpSecret, code)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired code.' },
        { status: 400 }
      )
    }

    await prisma.twoFactorTempToken.deleteMany({
      where: { userId: temp.userId },
    })

    const token = await createSession(temp.userId)
    const cookieStore = await cookies()
    setSessionTokenCookie(cookieStore, token)

    return NextResponse.json({
      user: {
        id: temp.user.id,
        email: temp.user.email,
        role: temp.user.role,
      },
    })
  } catch (error: unknown) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify' },
      { status: 500 }
    )
  }
}
