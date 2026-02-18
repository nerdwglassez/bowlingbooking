import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { profileUpdateSchema, changePasswordSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tier: true,
        tierDiscount: true,
        newsletterOptIn: true,
        emailReminders: true,
        smsReminders: true,
        smsPromotions: true,
        totpEnabled: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        ...user,
        tierDiscount: user.tierDiscount != null ? Number(user.tierDiscount) : null,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    // Optional change-password block
    if (body.currentPassword != null || body.newPassword != null) {
      const pw = changePasswordSchema.safeParse({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmPassword: body.confirmPassword,
      })
      if (!pw.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: pw.error.flatten() },
          { status: 400 }
        )
      }
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      const { verifyPassword } = await import('@/lib/auth')
      const valid = await verifyPassword(pw.data.currentPassword, user.passwordHash)
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }
      const passwordHash = await hashPassword(pw.data.newPassword)
      await prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash },
      })
      // Don't send password in response
    }

    // Profile fields (name, email, phone, newsletterOptIn)
    const profile = profileUpdateSchema.safeParse({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
    })
    const updateData: Record<string, string | null | boolean> = {}
    if (profile.success) {
      if (profile.data.firstName !== undefined) updateData.firstName = (profile.data.firstName ?? null) as string | null
      if (profile.data.lastName !== undefined) updateData.lastName = (profile.data.lastName ?? null) as string | null
      if (profile.data.phone !== undefined) updateData.phone = (profile.data.phone ?? null) as string | null
      if (profile.data.email !== undefined) {
        const email = profile.data.email as string
        const existing = await prisma.user.findUnique({
          where: { email },
        })
        if (existing && existing.id !== session.userId) {
          return NextResponse.json(
            { error: 'Email is already in use' },
            { status: 400 }
          )
        }
        updateData.email = email
      }
    }
    if (typeof body.newsletterOptIn === 'boolean') {
      updateData.newsletterOptIn = body.newsletterOptIn
    }
    if (typeof body.emailReminders === 'boolean') {
      updateData.emailReminders = body.emailReminders
    }
    if (typeof body.smsReminders === 'boolean') {
      updateData.smsReminders = body.smsReminders
    }
    if (typeof body.smsPromotions === 'boolean') {
      updateData.smsPromotions = body.smsPromotions
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.userId },
        data: updateData,
      })
    }

    // Sync to Mailchimp when user opts in to newsletter
    if (typeof body.newsletterOptIn === 'boolean' && body.newsletterOptIn === true) {
      const userForSync = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true, firstName: true, lastName: true },
      })
      if (userForSync) {
        const { syncContact } = await import('@/lib/mailchimp')
        await syncContact({
          email: userForSync.email,
          firstName: userForSync.firstName,
          lastName: userForSync.lastName,
        })
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        tier: true,
        tierDiscount: true,
        newsletterOptIn: true,
        emailReminders: true,
        smsReminders: true,
        smsPromotions: true,
        totpEnabled: true,
        createdAt: true,
      },
    })
    return NextResponse.json({
      user: user
        ? { ...user, tierDiscount: user.tierDiscount != null ? Number(user.tierDiscount) : null }
        : null,
    })
  } catch (error: unknown) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}


