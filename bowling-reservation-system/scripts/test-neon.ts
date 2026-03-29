/**
 * Test Neon database connection using DATABASE_URL from .env.local
 * Run from project root: npx tsx scripts/test-neon.ts
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env.local into process.env
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  })
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Ensure .env.local exists and contains DATABASE_URL.')
    process.exit(1)
  }

  const { prisma } = await import('../lib/db')
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Neon connection successful.')
  } catch (e: unknown) {
    const err = e as Error
    console.error('❌ Neon connection failed:', err.message)
    if (err.cause) console.error('   Cause:', err.cause)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
