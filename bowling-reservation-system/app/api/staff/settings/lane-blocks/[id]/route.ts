import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function canManageSettings(role: string): boolean {
  return role === 'MANAGER' || role === 'ADMIN'
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('STAFF')
    if (!canManageSettings(session.role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 })
    }

    const { id } = await params
    await prisma.laneBlock.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Delete staff lane block error:', error)
    return NextResponse.json({ error: 'Failed to delete lane block' }, { status: 500 })
  }
}
