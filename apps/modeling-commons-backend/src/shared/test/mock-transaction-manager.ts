import type { TransactionContext, TransactionManager } from '#src/shared/db/transaction.port.ts';

export function mockTransactionManager(): TransactionManager {
  return {
    async run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
      const afterCommit: Array<() => Promise<void> | void> = [];
      const ctx = {
        onCommit: (task: () => Promise<void> | void) => afterCommit.push(task),
      } as unknown as TransactionContext;

      const result = await fn(ctx);
      for (const task of afterCommit) await task();
      return result;
    },
  };
}
