import { describe, it, expect, vi } from 'vitest';
import makePrismaTransactionManager, {
  resolveTransaction,
} from '#src/shared/db/prisma-transaction.manager.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

function makeManager(tx: object, transactionFails = false) {
  const db = {
    $transaction: vi.fn(async (fn: (client: object) => Promise<unknown>) => {
      const result = await fn(tx);
      if (transactionFails) throw new Error('commit failed');
      return result;
    }),
  };
  return makePrismaTransactionManager({ db: db as unknown as ExtendedPrismaClient });
}

describe('prismaTransactionManager', () => {
  it('returns the callback result', async () => {
    await expect(makeManager({}).run(async () => 'done')).resolves.toBe('done');
  });

  it('rejects when the transaction fails to commit', async () => {
    await expect(makeManager({}, true).run(async () => 'done')).rejects.toThrow('commit failed');
  });

  it('rejects with the callback error', async () => {
    const callbackError = new Error('write failed');

    await expect(
      makeManager({}).run(async () => {
        throw callbackError;
      }),
    ).rejects.toBe(callbackError);
  });

  it('resolves the context to the transaction client while the callback runs', async () => {
    const tx = { name: 'tx' };

    const resolved = await makeManager(tx).run(async (ctx) => resolveTransaction(ctx));

    expect(resolved).toBe(tx);
  });

  it('stops resolving the context once the transaction is over', async () => {
    const ctx = await makeManager({}).run(async (inner) => inner);

    expect(() => resolveTransaction(ctx)).toThrow('Invalid transaction context');
  });

  it('refuses a context it did not create', () => {
    expect(() => resolveTransaction(Object.create(null) as TransactionContext)).toThrow(
      'Invalid transaction context',
    );
  });
});
