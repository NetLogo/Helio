import { describe, it, expect, vi, beforeEach } from 'vitest';
import eventRepository from '#src/modules/event/database/event.repository.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { realtimeTopics } from '#src/modules/realtime-topics.ts';
import realtimeConfig from '#src/config/realtime.ts';

const create = vi.fn().mockResolvedValue({ id: 'event-1' });
const executeRaw = vi.fn().mockResolvedValue(0);

vi.mock('#src/shared/db/prisma-transaction.manager.ts', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return { ...actual, resolveTransaction: () => ({ event: { create }, $executeRaw: executeRaw }) };
});

const params = {
  type: 'model_comment.created' as const,
  actorId: 'actor-1',
  resourceType: 'model',
  resourceId: 'model-1',
  payload: { commentId: 'comment-1', parentId: null },
};

describe('eventRepository.insertTx', () => {
  const jobQueue = { publishTx: vi.fn().mockResolvedValue(undefined) };
  const transactionManager = mockTransactionManager();
  const repository = eventRepository({ db: {}, jobQueue, realtimeTopics } as never);

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

  it('notifies the realtime channel with the topic message on the transaction client', async () => {
    await transactionManager.run(async (ctx) => repository.insertTx(ctx, params));

    expect(executeRaw).toHaveBeenCalledOnce();
    expect(executeRaw.mock.calls[0]?.slice(1)).toEqual([
      realtimeConfig.channel,
      ['{"topic":{"type":"model","id":"model-1"},"event":"model_comment.created"}'],
    ]);
  });

  it('notifies nothing for an event no realtime topic declares', async () => {
    await transactionManager.run(async (ctx) =>
      repository.insertTx(ctx, {
        type: 'model.liked',
        actorId: 'actor-1',
        resourceType: 'model',
        resourceId: 'model-1',
        payload: {},
      } as never),
    );

    expect(executeRaw).not.toHaveBeenCalled();
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
