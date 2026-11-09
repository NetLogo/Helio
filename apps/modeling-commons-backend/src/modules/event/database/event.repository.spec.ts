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

describe('eventRepository.insertTx', () => {
  const jobQueue = { publishTx: vi.fn().mockResolvedValue(['job-1', 'job-2']) };
  const transactionManager = mockTransactionManager();
  const repository = eventRepository({ db: {}, jobQueue } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes the inserted event under its type in the same transaction', async () => {
    await transactionManager.run(async (ctx) => {
      await repository.insertTx(ctx, params);
      expect(jobQueue.publishTx).toHaveBeenCalledWith(ctx, 'model_comment.created', {
        eventId: 'event-1',
      });
    });
  });

  it('publishes once per event the transaction wrote', async () => {
    create.mockResolvedValueOnce({ id: 'event-1' }).mockResolvedValueOnce({ id: 'event-2' });

    await transactionManager.run(async (ctx) => {
      await repository.insertTx(ctx, params);
      await repository.insertTx(ctx, params);
    });

    expect(jobQueue.publishTx.mock.calls.map((call) => call[2])).toEqual([
      { eventId: 'event-1' },
      { eventId: 'event-2' },
    ]);
  });

  it('fails the transaction when the publish fails', async () => {
    const error = new Error('No realtime job was created for a model_comment.created publish');
    jobQueue.publishTx.mockRejectedValueOnce(error);

    await expect(
      transactionManager.run(async (ctx) => repository.insertTx(ctx, params)),
    ).rejects.toBe(error);
  });
});

describe('eventRepository.search', () => {
  const count = vi.fn().mockResolvedValue(0);
  const findMany = vi.fn().mockResolvedValue([]);
  const repository = eventRepository({ db: { event: { count, findMany } } } as never);
  const page = {
    limit: 20,
    page: 0,
    offset: 0,
    orderBy: { field: 'createdAt', param: 'desc' as const },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('narrows to the given ids', async () => {
    await repository.search({ ids: ['event-1', 'event-2'] }, page);

    expect(count).toHaveBeenCalledWith({ where: { id: { in: ['event-1', 'event-2'] } } });
    expect(findMany.mock.calls[0]![0].where).toEqual({ id: { in: ['event-1', 'event-2'] } });
  });

  it('matches nothing for an empty id list instead of dropping the filter', async () => {
    await repository.search({ ids: [] }, page);

    expect(count).toHaveBeenCalledWith({ where: { id: { in: [] } } });
  });
});
