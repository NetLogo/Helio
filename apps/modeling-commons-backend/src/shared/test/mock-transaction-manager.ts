import type { TransactionContext, TransactionManager } from '#src/shared/db/transaction.port.ts';

export function mockTransactionManager(): TransactionManager {
  return {
    async run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
      return fn({} as TransactionContext);
    },
  };
}
