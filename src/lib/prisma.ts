import { loadEnvConfig } from '@next/env'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// Next/Turbopack may not inject `.env.local` into `process.env` before Prisma
// initializes. Load env files the same way Next does so DATABASE_URL is present.
loadEnvConfig(process.cwd())

export function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL?.trim() ||
    (process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('DATABASE_URL is not set')
        })()
      : 'postgresql://localhost:5432/dev_placeholder')

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Next 16 + dev hot-reload safe singleton.
declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma
