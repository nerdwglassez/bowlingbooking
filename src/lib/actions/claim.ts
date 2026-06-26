'use server'

import { revalidatePath } from 'next/cache'

import { hashPassword } from '@/lib/auth'
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
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existingUser) {
    throw new Error(
      'An account already exists for this email. Sign in to manage bookings.',
    )
  }
  const passwordHash = await hashPassword(input.password)

  await prisma.$transaction(async (tx) => {
    const existingUserInTransaction = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingUserInTransaction) {
      throw new Error(
        'An account already exists for this email. Sign in to manage bookings.',
      )
    }

    const user = await tx.user.create({
      data: {
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

  revalidatePath('/dashboard')
  return { ok: true, signInEmail: email }
}

export async function getClaimTokenForBooking(
  bookingId: string,
  email: string,
  confirmationCode: string,
): Promise<string | null> {
  if (isDevWithoutDb()) return 'mock-claim-token'
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedCode = confirmationCode.trim().toUpperCase()
  if (!bookingId || !normalizedEmail || !normalizedCode) return null

  const row = await prisma.claimToken.findFirst({
    where: {
      bookingId,
      booking: {
        is: {
          confirmationCode: normalizedCode,
          customerEmail: { equals: normalizedEmail, mode: 'insensitive' },
        },
      },
    },
    select: { token: true, claimedAt: true, expiresAt: true },
  })
  if (!row || row.claimedAt != null || row.expiresAt <= new Date()) {
    return null
  }
  return row.token
}
