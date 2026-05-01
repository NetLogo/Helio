import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: `tsx ./prisma/${process.env.PRISMA_SEED_FILE ?? 'seed.ts'}`,
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
