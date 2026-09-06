'use server'

import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'

import { AuthError, hashPassword, signIn } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export interface ClaimBookingInput {
  token: string
  password: string
  name?: string
}

export interface ClaimBookingResult {
  ok: boolean
  mocked?: boolean
  signInEmail?: string
}

export async function claimBookingAccountAction(
  input: ClaimBookingInput,
): Promise<ClaimBookingResult> {
  const token = input.token.trim()
  if (!token || input.password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  if (isDevWithoutDb()) {
    return { ok: true, mocked: true }
  }

  const claim = await prisma.claimToken.findUnique({
    where: { token },
    include: { booking: true },
  })
  if (!claim || claim.claimedAt != null || claim.expiresAt <= new Date()) {
    throw new Error('This account link has expired or is invalid.')
  }

  const email = claim.email.trim().toLowerCase()
  const passwordHash = await hashPassword(input.password)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name: input.name?.trim() || undefined,
        passwordHash,
        role: 'CUSTOMER',
        tenantId: claim.tenantId,
      },
      create: {
        email,
        name: input.name?.trim() || null,
        passwordHash,
        role: 'CUSTOMER',
        tenantId: claim.tenantId,
      },
    })
    await tx.booking.update({
      where: { id: claim.bookingId },
      data: { userId: user.id },
    })
    await tx.claimToken.update({
      where: { id: claim.id },
      data: { claimedAt: new Date() },
    })
  })

  // Establish a session before the success page sends the customer to
  // /dashboard — otherwise requireUser() bounces them to /signin.
  try {
    await signIn('credentials', {
      email,
      password: input.password,
      redirect: false,
    })
  } catch (err) {
    unstable_rethrow(err)
    if (err instanceof AuthError) {
      throw new Error(
        'Account created, but sign-in failed. Please sign in with your new password.',
      )
    }
    throw err
  }

  revalidatePath('/dashboard')
  return { ok: true, signInEmail: email }
}

export async function getClaimTokenForBooking(
  bookingId: string,
): Promise<string | null> {
  if (isDevWithoutDb()) return 'mock-claim-token'
  const row = await prisma.claimToken.findUnique({
    where: { bookingId },
    select: { token: true, claimedAt: true, expiresAt: true },
  })
  if (!row || row.claimedAt != null || row.expiresAt <= new Date()) {
    return null
  }
  return row.token
}
