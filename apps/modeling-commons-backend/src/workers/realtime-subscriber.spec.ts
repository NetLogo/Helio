import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import {
  listEventSignals,
  listRecipientSignals,
  startRealtimeSubscriber,
  type RealtimeJobData,
} from '#src/workers/realtime-subscriber.ts';

const bossInstance = {
  work: vi.fn().mockResolvedValue('worker-1'),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type Deps = Parameters<typeof startRealtimeSubscriber>[0];
type Handler = (jobs: Array<{ id: string; data: RealtimeJobData }>) => Promise<void>;

async function start() {
  const eventRepository = mockEventRepository();
  const db = { $executeRaw: vi.fn().mockResolvedValue(1) };

  await startRealtimeSubscriber({
    boss: bossInstance as unknown as PgBoss,
    db: db as unknown as Deps['db'],
    eventRepository: eventRepository as unknown as Deps['eventRepository'],
    logger,
  });

  const handler = bossInstance.work.mock.calls[0]![2] as Handler;
  const run = async (data: RealtimeJobData) => handler([{ id: 'job-1', data }]);
  const notified = () =>
    db.$executeRaw.mock.calls.map(([, channel, payload]) => [channel, payload] as const);
  return { run, eventRepository, db, notified };
}

describe('listEventSignals', () => {
  it.each(['model_comment.created', 'model_comment.updated', 'model_comment.deleted'])(
    'signals the model channel with the model id for %s',
    (type) => {
      expect(listEventSignals({ type, resourceId: 'model-1' })).toEqual([
        { channel: 'mc_model', payload: 'model-1' },
      ]);
    },
  );

  it('signals nothing for an event type it does not know', () => {
    expect(listEventSignals({ type: 'model.created', resourceId: 'model-1' })).toEqual([]);
  });
});

describe('listRecipientSignals', () => {
  it('signals the user channel once per distinct recipient', () => {
    expect(listRecipientSignals(['u1', 'u2', 'u1'])).toEqual([
      { channel: 'mc_user', payload: 'u1' },
      { channel: 'mc_user', payload: 'u2' },
    ]);
  });
});

describe('startRealtimeSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the realtime queue with its dead letter', async () => {
    await start();

    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      'realtime-dead',
      workersConfig.deadLetter,
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith('realtime', {
      ...workersConfig.realtime.queue,
      deadLetter: 'realtime-dead',
    });
  });

  it('polls the realtime queue at its own fast interval', async () => {
    await start();

    expect(bossInstance.work).toHaveBeenCalledWith(
      'realtime',
      {
        batchSize: 1,
        localConcurrency: workersConfig.realtime.work.localConcurrency,
        pollingIntervalSeconds: workersConfig.realtime.work.pollingIntervalSeconds,
      },
      expect.any(Function),
    );
  });

  it('notifies the model channel with the model id of a comment event', async () => {
    const { run, eventRepository, notified } = await start();
    eventRepository.findOneById.mockResolvedValue({
      id: 'event-1',
      type: 'model_comment.created',
      resourceId: 'model-1',
    });

    await run({ eventId: 'event-1' });

    expect(eventRepository.findOneById).toHaveBeenCalledWith('event-1');
    expect(notified()).toEqual([['mc_model', 'model-1']]);
  });

  it('notifies the user channel once per recipient of created notifications', async () => {
    const { run, eventRepository, notified } = await start();

    await run({ recipientIds: ['u1', 'u2'] });

    expect(eventRepository.findOneById).not.toHaveBeenCalled();
    expect(notified()).toEqual([
      ['mc_user', 'u1'],
      ['mc_user', 'u2'],
    ]);
  });

  it('completes without notifying when the event no longer exists', async () => {
    const { run, eventRepository, notified } = await start();
    eventRepository.findOneById.mockResolvedValue(null);

    await expect(run({ eventId: 'gone' })).resolves.toBeUndefined();

    expect(notified()).toEqual([]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('lets a failed notify propagate so pg-boss retries the job', async () => {
    const { run, db } = await start();
    const error = new Error('connection lost');
    db.$executeRaw.mockRejectedValue(error);

    await expect(run({ recipientIds: ['u1'] })).rejects.toBe(error);
  });
});
