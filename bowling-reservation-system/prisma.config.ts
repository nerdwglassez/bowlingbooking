import { config } from 'dotenv'
import { resolve } from 'path'
import { defineConfig, env } from 'prisma/config'

// Match seed / Next: local DB URL is usually in `.env.local`; Prisma CLI only loaded `.env` before.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
