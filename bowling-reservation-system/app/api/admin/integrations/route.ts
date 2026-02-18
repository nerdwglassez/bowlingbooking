import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  type IntegrationId,
  getIntegrationConfigMasked,
  getIntegrationStatus,
  setIntegrationConfig,
} from '@/lib/integration-settings'

const INTEGRATION_IDS: IntegrationId[] = [
  'stripe',
  'resend',
  'twilio',
  'mailchimp',
  'slack',
  'google-analytics',
  'pos-export',
]

export async function GET() {
  try {
    await requireAuth('ADMIN')

    const integrations = await Promise.all(
      INTEGRATION_IDS.map(async (id) => {
        const config = await getIntegrationConfigMasked(id)
        const status = getIntegrationStatus(id, config)
        return { id, config: config ?? {}, status }
      })
    )

    return NextResponse.json({ integrations })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get integrations error:', error)
    return NextResponse.json(
      { error: 'Failed to load integrations' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const { integrationId, config } = body as { integrationId?: string; config?: Record<string, string> }

    if (!integrationId || !config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'integrationId and config are required' },
        { status: 400 }
      )
    }

    if (!INTEGRATION_IDS.includes(integrationId as IntegrationId)) {
      return NextResponse.json(
        { error: 'Invalid integrationId' },
        { status: 400 }
      )
    }

    await setIntegrationConfig(integrationId as IntegrationId, config)

    return NextResponse.json({
      message: 'Integration updated successfully',
      integrationId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update integration error:', error)
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}
