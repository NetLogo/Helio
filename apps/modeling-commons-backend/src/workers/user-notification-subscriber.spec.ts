import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import { startUserNotificationSubscriber } from '#src/workers/user-notification-subscriber.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import workersConfig from '#src/config/workers.ts';

const bossInstance = {
  work: vi.fn().mockResolvedValue('worker-1'),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type Deps = Parameters<typeof startUserNotificationSubscriber>[0];
type Handler = (jobs: Array<{ id: string; data: { eventId: string } }>) => Promise<void>;

const event = { id: 'event-1', type: 'model_comment.created' };

async function start() {
  const eventRepository = mockEventRepository();
  const userNotificationService = { handleEvent: vi.fn().mockResolvedValue(undefined) };

  await startUserNotificationSubscriber({
    boss,
    eventRepository: eventRepository as unknown as Deps['eventRepository'],
    userNotificationService: userNotificationService as unknown as Deps['userNotificationService'],
    logger,
  });

  const handler = bossInstance.work.mock.calls[0]![2] as Handler;
  const run = async (eventId: string) => handler([{ id: 'job-1', data: { eventId } }]);
  return { run, eventRepository, userNotificationService };
}

describe('startUserNotificationSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the user-notifications queue with its dead letter', async () => {
    await start();

    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      'user-notifications-dead',
      workersConfig.deadLetter,
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith('user-notifications', {
      ...workersConfig.userNotifications.queue,
      deadLetter: 'user-notifications-dead',
    });
  });

  it('works one job at a time with local concurrency and no schedule', async () => {
    await start();

    expect(bossInstance.work).toHaveBeenCalledWith(
      'user-notifications',
      {
        batchSize: 1,
        localConcurrency: workersConfig.userNotifications.work.localConcurrency,
        pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
      },
      expect.any(Function),
    );
    expect(bossInstance.schedule).not.toHaveBeenCalled();
  });

  it('hands the loaded event to the notification service', async () => {
    const { run, eventRepository, userNotificationService } = await start();
    eventRepository.findOneById.mockResolvedValue(event);

    await run('event-1');

    expect(eventRepository.findOneById).toHaveBeenCalledWith('event-1');
    expect(userNotificationService.handleEvent).toHaveBeenCalledWith(event);
  });

  it('completes without dispatching when the event no longer exists', async () => {
    const { run, eventRepository, userNotificationService } = await start();
    eventRepository.findOneById.mockResolvedValue(null);

    await expect(run('gone')).resolves.toBeUndefined();

    expect(userNotificationService.handleEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('lets a handler error propagate so pg-boss retries the job', async () => {
    const { run, eventRepository, userNotificationService } = await start();
    eventRepository.findOneById.mockResolvedValue(event);
    const error = new Error('notifier exploded');
    userNotificationService.handleEvent.mockRejectedValue(error);

    await expect(run('event-1')).rejects.toBe(error);
  });
});
