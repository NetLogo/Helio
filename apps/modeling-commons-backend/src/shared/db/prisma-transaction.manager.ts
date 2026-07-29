import type { ExtendedPrismaClient, PrismaTransactionClient } from '#src/lib/prisma.ts';
import type { TransactionContext, TransactionManager } from '#src/shared/db/transaction.port.ts';
import type { FastifyBaseLogger } from 'fastify';

const contextMap = new WeakMap<TransactionContext, PrismaTransactionClient>();

export function resolveTransaction(ctx: TransactionContext): PrismaTransactionClient {
  const client = contextMap.get(ctx);
  if (!client) throw new Error('Invalid transaction context');
  return client;
}

export default function makePrismaTransactionManager({
  db,
  logger,
}: {
  db: ExtendedPrismaClient;
  logger: FastifyBaseLogger;
}): TransactionManager {
  return {
    async run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
      const afterCommit: Array<() => Promise<void> | void> = [];
      const ctx = Object.assign(Object.create(null) as TransactionContext, {
        onCommit(task: () => Promise<void> | void) {
          afterCommit.push(task);
        },
      });

      const result = await db.$transaction(async (tx) => {
        contextMap.set(ctx, tx);
        try {
          return await fn(ctx);
        } finally {
          contextMap.delete(ctx);
        }
      });

      for (const task of afterCommit) {
        try {
          await task();
        } catch (error) {
          logger.error({
            name: 'TransactionManager',
            message: 'An after-commit task failed',
            error,
          });
        }
      }

      return result;
    },
  };
}
