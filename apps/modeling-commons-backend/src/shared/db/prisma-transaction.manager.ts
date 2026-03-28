import type { ExtendedPrismaClient, PrismaTransactionClient } from '#src/lib/prisma.ts';
import type { TransactionContext, TransactionManager } from '#src/shared/db/transaction.port.ts';

const contextMap = new WeakMap<TransactionContext, PrismaTransactionClient>();

export function resolveTransaction(ctx: TransactionContext): PrismaTransactionClient {
  const client = contextMap.get(ctx);
  if (!client) throw new Error('Invalid transaction context');
  return client;
}

export default function makePrismaTransactionManager({
  db,
}: {
  db: ExtendedPrismaClient;
}): TransactionManager {
  return {
    async run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
      return db.$transaction(async (tx) => {
        const ctx = Object.create(null) as TransactionContext;
        contextMap.set(ctx, tx);
        try {
          return await fn(ctx);
        } finally {
          contextMap.delete(ctx);
        }
      });
    },
  };
}
