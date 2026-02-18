import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateTotpSecret } from '@/lib/totp'

/** POST: Start 2FA setup. Generates secret, stores in totpSecretPending, returns QR and secret. */
export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, totpEnabled: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (user.totpEnabled) {
      return NextResponse.json(
        { error: 'Two-factor authentication is already enabled' },
        { status: 400 }
      )
    }

    const { secret, qrCodeDataUrl, otpauthUrl } = await generateTotpSecret(user.email)

    await prisma.user.update({
      where: { id: session.userId },
      data: { totpSecretPending: secret },
    })

    return NextResponse.json({
      qrCodeDataUrl,
      otpauthUrl,
      secret, // for manual entry in authenticator app
    })
  } catch (error: unknown) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to start 2FA setup' },
      { status: 500 }
    )
  }
}
