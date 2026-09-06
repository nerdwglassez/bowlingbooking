#!/usr/bin/env node
/**
 * Apply pending Prisma migrations during `npm run build` (Vercel).
 *
 * Skips when DATABASE_URL is unset or not a real connection string so local
 * / CI `prisma generate` flows stay offline-friendly. Production and Preview
 * builds with a real Neon URL always run `prisma migrate deploy`.
 */
import { spawnSync } from 'node:child_process'

const url = process.env.DATABASE_URL?.trim() ?? ''
const looksReal =
  url.length > 0 &&
  /^(postgres(ql)?:\/\/)/i.test(url) &&
  !url.includes('prisma_generate_placeholder')

if (!looksReal) {
  console.log(
    '[migrate-deploy] Skipping prisma migrate deploy (no real DATABASE_URL).',
  )
  process.exit(0)
}

console.log('[migrate-deploy] Running prisma migrate deploy…')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error('[migrate-deploy] Failed to start prisma:', result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
