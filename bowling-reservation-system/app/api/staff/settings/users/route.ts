import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['STAFF', 'MANAGER', 'ADMIN']),
})

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

export async function GET() {
  try {
    const session = await requireAuth('STAFF')

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['STAFF', 'MANAGER', 'ADMIN'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({
      users,
      canEdit: session.role === 'ADMIN',
      canDelete: session.role === 'ADMIN',
      currentUserId: session.userId,
    })
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get settings users error:', error)
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth('STAFF')
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update roles' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.userId === session.userId) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_USER_ROLE_UPDATED',
        entityType: 'user',
        entityId: updated.id,
        userId: session.userId,
        details: JSON.stringify({ role: updated.role }),
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Patch settings users error:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}
