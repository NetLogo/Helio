import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import {
  listRecipientEvents,
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
    db.$executeRaw.mock.calls.flatMap(([, channel, payloads]) =>
      (payloads as Array<string>).map((payload) => [channel, JSON.parse(payload)] as const),
    );
  return { run, eventRepository, db, notified };
}

describe('listRecipientEvents', () => {
  it('turns each distinct recipient into one created notification event', () => {
    expect(listRecipientEvents(['u1', 'u2', 'u1'])).toEqual([
      { type: 'user_notification.created', resourceId: 'u1' },
      { type: 'user_notification.created', resourceId: 'u2' },
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

  it.each(['model_comment.created', 'model_comment.updated', 'model_comment.deleted'])(
    'notifies the realtime channel once with the model topic of a %s event',
    async (type) => {
      const { run, eventRepository, notified } = await start();
      eventRepository.findOneById.mockResolvedValue({ id: 'event-1', type, resourceId: 'model-1' });

      await run({ eventId: 'event-1' });

      expect(eventRepository.findOneById).toHaveBeenCalledWith('event-1');
      expect(notified()).toEqual([
        ['mc_realtime', { topic: { type: 'model', id: 'model-1' }, event: type }],
      ]);
    },
  );

  it('notifies nothing for an event type no topic declares', async () => {
    const { run, eventRepository, db } = await start();
    eventRepository.findOneById.mockResolvedValue({
      id: 'event-1',
      type: 'model.created',
      resourceId: 'model-1',
    });

    await run({ eventId: 'event-1' });

    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it('notifies the user topic once per distinct recipient of created notifications', async () => {
    const { run, eventRepository, db, notified } = await start();

    await run({ recipientIds: ['u1', 'u2', 'u1'] });

    expect(eventRepository.findOneById).not.toHaveBeenCalled();
    expect(db.$executeRaw).toHaveBeenCalledOnce();
    const created = 'user_notification.created';
    expect(notified()).toEqual([
      ['mc_realtime', { topic: { type: 'user', id: 'u1' }, event: created }],
      ['mc_realtime', { topic: { type: 'user', id: 'u2' }, event: created }],
    ]);
  });

  it('completes without notifying when the event no longer exists', async () => {
    const { run, eventRepository, db } = await start();
    eventRepository.findOneById.mockResolvedValue(null);

    await expect(run({ eventId: 'gone' })).resolves.toBeUndefined();

    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('lets a failed notify propagate so pg-boss retries the job', async () => {
    const { run, db } = await start();
    const error = new Error('connection lost');
    db.$executeRaw.mockRejectedValue(error);

    await expect(run({ recipientIds: ['u1'] })).rejects.toBe(error);
  });
});
