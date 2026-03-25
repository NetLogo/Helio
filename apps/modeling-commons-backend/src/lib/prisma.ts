import { PrismaClient } from '#prisma/client';
import env from '#src/config/env.ts';
import { softDeleteExtension } from '#src/lib/prisma-middleware.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: env.db.url,
});

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: env.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export const prisma = basePrisma.$extends(softDeleteExtension);

export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransactionClient = Parameters<
  Parameters<ExtendedPrismaClient['$transaction']>[0]
>[0];

export default prisma;
