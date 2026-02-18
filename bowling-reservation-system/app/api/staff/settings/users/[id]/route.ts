import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((value) => (value === '' ? null : value)),
    role: z.enum(['STAFF', 'MANAGER', 'ADMIN']).optional(),
  })
  .refine(
    (data) =>
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined ||
      data.role !== undefined,
    { message: 'At least one field is required' }
  )

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth('STAFF')
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update users' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      })
      if (emailTaken && emailTaken.id !== id) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
      }
    }

    if (id === session.userId && parsed.data.role && parsed.data.role !== existing.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }

    if (existing.role === 'ADMIN' && parsed.data.role && parsed.data.role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'At least one admin must remain' }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        role: parsed.data.role,
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
    })

    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_USER_UPDATED',
        entityType: 'user',
        entityId: updated.id,
        userId: session.userId,
        details: JSON.stringify({
          changedFields: Object.keys(parsed.data),
        }),
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Patch settings user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth('STAFF')
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove users' }, { status: 403 })
    }

    const { id } = await params
    if (id === session.userId) {
      return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'At least one admin must remain' }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_USER_REMOVED',
        entityType: 'user',
        entityId: id,
        userId: session.userId,
        details: JSON.stringify({ email: target.email }),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete settings user error:', error)
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 })
  }
}
