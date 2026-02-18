import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.string().min(1), // e.g. "availability,bookings:read,bookings:write"
  rateLimitPerMinute: z.number().int().min(1).max(1000).optional(),
})

/**
 * GET /api/admin/api-keys
 * List API keys (prefix and metadata only; never return the secret).
 */
export async function GET() {
  try {
    await requireAuth('ADMIN')
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimitPerMinute: true,
        createdAt: true,
        lastUsedAt: true,
      },
    })
    return NextResponse.json({ apiKeys: keys })
  } catch (e: any) {
    if (e.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw e
  }
}

/**
 * POST /api/admin/api-keys
 * Create a new API key. The plain key is returned only once.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('ADMIN')
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { name, scopes, rateLimitPerMinute } = parsed.data
    const { plainKey, keyPrefix, keyHash } = generateApiKey()
    await prisma.apiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash,
        scopes,
        rateLimitPerMinute: rateLimitPerMinute ?? 60,
        createdBy: session.userId,
      },
    })
    return NextResponse.json({
      message: 'API key created. Store the key securely; it will not be shown again.',
      key: plainKey,
      keyPrefix,
      scopes,
    })
  } catch (e: any) {
    if (e.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create API key error:', e)
    return NextResponse.json(
      { error: e.message || 'Failed to create API key' },
      { status: 500 }
    )
  }
}
