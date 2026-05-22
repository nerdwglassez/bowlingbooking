import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'

// Next/Turbopack may not inject `.env.local` into `process.env` before Prisma
// initializes. Load env files the same way Next does so DATABASE_URL is present.
loadEnvConfig(process.cwd())

// Next 16 + dev hot-reload safe singleton.
declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma
