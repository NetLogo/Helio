import { describe, it, expect, vi } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';

function makeDeps(transactionFails = false) {
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const db = {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const result = await fn({});
      if (transactionFails) throw new Error('commit failed');
      return result;
    }),
  };

  return {
    logger,
    manager: makePrismaTransactionManager({
      db: db as unknown as ExtendedPrismaClient,
      logger: logger as unknown as FastifyBaseLogger,
    }),
  };
}

describe('prismaTransactionManager', () => {
  it('returns the callback result', async () => {
    const { manager } = makeDeps();

    await expect(manager.run(async () => 'done')).resolves.toBe('done');
  });

  it('runs after-commit tasks once the transaction resolves, in registration order', async () => {
    const { manager } = makeDeps();
    const order: Array<string> = [];

    await manager.run(async (ctx) => {
      ctx.onCommit(() => {
        order.push('first');
      });
      ctx.onCommit(() => {
        order.push('second');
      });
      order.push('body');
    });

    expect(order).toEqual(['body', 'first', 'second']);
  });

  it('does not run after-commit tasks when the transaction throws', async () => {
    const { manager } = makeDeps(true);
    const task = vi.fn();

    await expect(
      manager.run(async (ctx) => {
        ctx.onCommit(task);
      }),
    ).rejects.toThrow('commit failed');
    expect(task).not.toHaveBeenCalled();
  });

  it('logs a failing after-commit task and still runs the rest', async () => {
    const { manager, logger } = makeDeps();
    const second = vi.fn();

    await expect(
      manager.run(async (ctx) => {
        ctx.onCommit(() => Promise.reject(new Error('nudge failed')));
        ctx.onCommit(second);
        return 'committed';
      }),
    ).resolves.toBe('committed');

    expect(second).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TransactionManager' }),
    );
  });
});
