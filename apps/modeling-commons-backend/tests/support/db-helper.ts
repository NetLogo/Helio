import type { FastifyInstance } from 'fastify';

export async function cleanDatabase(server: FastifyInstance): Promise<void> {
  const { prisma } = server.diContainer.cradle as {
    prisma: {
      $executeRawUnsafe: (query: string) => Promise<number>;
      $queryRawUnsafe: (query: string) => Promise<{ tablename: string }[]>;
    };
  };

  const tables = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%';`,
  );

  if (tables.length === 0) return;

  const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE;`);
}
