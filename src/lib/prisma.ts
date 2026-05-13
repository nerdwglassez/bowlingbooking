import { PrismaClient } from '@prisma/client'

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
