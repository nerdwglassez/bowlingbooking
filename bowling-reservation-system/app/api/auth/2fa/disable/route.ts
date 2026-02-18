import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTotpToken } from '@/lib/totp'
import { z } from 'zod'

const bodySchema = z.object({ code: z.string().length(6, 'Code must be 6 digits') })

/** POST: Disable 2FA after verifying current code. */
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
      select: { id: true, totpSecret: true, totpEnabled: true },
    })
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: 'Two-factor is not enabled.' },
        { status: 400 }
      )
    }

    const valid = verifyTotpToken(user.totpSecret, parsed.data.code)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired code.' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        totpSecret: null,
        totpSecretPending: null,
        totpEnabled: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
