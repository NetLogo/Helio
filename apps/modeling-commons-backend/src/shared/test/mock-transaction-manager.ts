import type { TransactionContext, TransactionManager } from '#src/shared/db/transaction.port.ts';

const pendingEffects = new WeakMap<TransactionContext, Array<() => void>>();

export function stageCommitEffect(ctx: TransactionContext, effect: () => void): void {
  const effects = pendingEffects.get(ctx);
  if (!effects) throw new Error('Effect staged outside a mock transaction');
  effects.push(effect);
}

export function mockTransactionManager(): TransactionManager {
  return {
    async run<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
      const ctx = Object.create(null) as TransactionContext;
      const effects: Array<() => void> = [];
      pendingEffects.set(ctx, effects);
      const result = await fn(ctx);
      for (const effect of effects) effect();
      return result;
    },
  };
}
