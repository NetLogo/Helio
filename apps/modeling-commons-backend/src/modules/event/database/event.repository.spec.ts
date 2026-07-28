import { describe, it, expect, vi, beforeEach } from 'vitest';
import eventRepository from '#src/modules/event/database/event.repository.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';

const create = vi.fn().mockResolvedValue({ id: 'event-1' });

vi.mock('#src/shared/db/prisma-transaction.manager.ts', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, resolveTransaction: () => ({ event: { create } }) };
});

const params = {
  type: 'model_comment.created',
  actorId: 'actor-1',
  resourceType: 'model',
  resourceId: 'model-1',
  payload: {},
};

describe('eventRepository.insert', () => {
  const eventQueueNotifier = { bind: vi.fn(), nudge: vi.fn().mockResolvedValue(undefined) };
  const transactionManager = mockTransactionManager();
  const repository = eventRepository({ db: {}, eventQueueNotifier } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nudges the processor after the transaction commits, not during it', async () => {
    await transactionManager.run(async (ctx) => {
      await repository.insert(ctx, params);
      expect(eventQueueNotifier.nudge).not.toHaveBeenCalled();
    });

    expect(eventQueueNotifier.nudge).toHaveBeenCalledTimes(1);
  });

  it('nudges once however many events one transaction wrote', async () => {
    await transactionManager.run(async (ctx) => {
      await repository.insert(ctx, params);
      await repository.insert(ctx, params);
      await repository.insert(ctx, params);
    });

    expect(create).toHaveBeenCalledTimes(3);
    expect(eventQueueNotifier.nudge).toHaveBeenCalledTimes(1);
  });

  it('nudges again for a separate transaction', async () => {
    await transactionManager.run(async (ctx) => repository.insert(ctx, params));
    await transactionManager.run(async (ctx) => repository.insert(ctx, params));

    expect(eventQueueNotifier.nudge).toHaveBeenCalledTimes(2);
  });
});
