import { config as loadEnv } from 'dotenv'

import { defineConfig } from 'prisma/config'

// Prisma CLI does not load `.env.local` by default — mirror Next.js env order.
loadEnv()
loadEnv({ path: '.env.local', override: true })

/** Generate/migrate only need a syntactically valid URL; CI may omit DATABASE_URL. */
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://localhost:5432/prisma_generate_placeholder'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx --tsconfig tsconfig.json prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
})
