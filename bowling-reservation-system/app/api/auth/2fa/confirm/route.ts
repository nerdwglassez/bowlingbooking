import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTotpToken } from '@/lib/totp'
import { z } from 'zod'

const bodySchema = z.object({ code: z.string().length(6, 'Code must be 6 digits') })

/** POST: Confirm 2FA setup with a code from the authenticator app. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid code' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, totpSecretPending: true, totpEnabled: true },
    })
    if (!user || !user.totpSecretPending) {
      return NextResponse.json(
        { error: 'No 2FA setup in progress. Start setup first.' },
        { status: 400 }
      )
    }
    if (user.totpEnabled) {
      return NextResponse.json(
        { error: 'Two-factor is already enabled' },
        { status: 400 }
      )
    }

    const valid = verifyTotpToken(user.totpSecretPending, parsed.data.code)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired code. Try again.' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        totpSecret: user.totpSecretPending,
        totpSecretPending: null,
        totpEnabled: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('2FA confirm error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm 2FA' },
      { status: 500 }
    )
  }
}
