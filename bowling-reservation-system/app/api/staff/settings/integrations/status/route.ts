import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  type IntegrationId,
  getIntegrationConfig,
  getIntegrationStatus,
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

/**
 * Returns integration status only (no config). Allowed for STAFF so they can see
 * which integrations are connected without needing admin.
 */
export async function GET() {
  try {
    await requireAuth('STAFF')

    const integrations = await Promise.all(
      INTEGRATION_IDS.map(async (id) => {
        const config = await getIntegrationConfig(id)
        const status = getIntegrationStatus(id, config)
        return { id, status }
      })
    )

    return NextResponse.json({ integrations })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get integration status error:', error)
    return NextResponse.json(
      { error: 'Failed to load status' },
      { status: 500 }
    )
  }
}
