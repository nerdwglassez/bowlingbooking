import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

function createPrisma(): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5_000,
    })
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool
  }
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
