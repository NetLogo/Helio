import type { ExtendedPrismaClient, PrismaTransactionClient } from '#src/lib/prisma.ts';
import type { Db } from 'pg-boss';

type RawQueryClient = Pick<ExtendedPrismaClient | PrismaTransactionClient, '$queryRawUnsafe'>;

export function makePrismaBossDb(client: RawQueryClient): Db {
  return {
    // pg-boss supplies its own SQL and reads a pg-style `{ rows }` result; Prisma returns the bare array.
    executeSql: async (text, values = []) => ({
      rows: await client.$queryRawUnsafe<Array<unknown>>(text, ...values),
    }),
  };
}
