import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import { startUserNotificationSubscriber } from '#src/workers/user-notification-subscriber.ts';
import workersConfig from '#src/config/workers.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';

const bossInstance = {
  work: vi.fn().mockResolvedValue('worker-1'),
  schedule: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type Deps = Parameters<typeof startUserNotificationSubscriber>[0];
type Handler = (
  jobs: Array<{ id: string; data: { kind: 'event'; eventId: string } }>,
) => Promise<void>;

const event = { id: 'event-1', type: 'model_comment.created' };

async function start() {
  const eventRepository = mockPort<EventRepositoryPort>();
  const notificationDeliveryService = { handleEvent: vi.fn().mockResolvedValue(undefined) };

  await startUserNotificationSubscriber({
    boss,
    eventRepository: eventRepository as unknown as Deps['eventRepository'],
    notificationDeliveryService:
      notificationDeliveryService as unknown as Deps['notificationDeliveryService'],
    logger,
  });

  const handler = bossInstance.work.mock.calls[0]![2] as Handler;
  const run = async (eventId: string) =>
    handler([{ id: 'job-1', data: { kind: 'event', eventId } }]);
  return { run, eventRepository, notificationDeliveryService };
}

describe('startUserNotificationSubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('works one job at a time with local concurrency and no schedule', async () => {
    await start();

    expect(bossInstance.work).toHaveBeenCalledWith(
      'user-notifications',
      {
        localConcurrency: workersConfig.userNotifications.work.localConcurrency,
      },
      expect.any(Function),
    );
    expect(bossInstance.schedule).not.toHaveBeenCalled();
  });

  it('hands the loaded event to the notification service', async () => {
    const { run, eventRepository, notificationDeliveryService } = await start();
    eventRepository.findOneById.mockResolvedValue(event);

    await run('event-1');

    expect(eventRepository.findOneById).toHaveBeenCalledWith('event-1');
    expect(notificationDeliveryService.handleEvent).toHaveBeenCalledWith(event);
  });

  it('completes without dispatching when the event no longer exists', async () => {
    const { run, eventRepository, notificationDeliveryService } = await start();
    eventRepository.findOneById.mockResolvedValue(null);

    await expect(run('gone')).resolves.toBeUndefined();

    expect(notificationDeliveryService.handleEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('lets a handler error propagate so pg-boss retries the job', async () => {
    const { run, eventRepository, notificationDeliveryService } = await start();
    eventRepository.findOneById.mockResolvedValue(event);
    const error = new Error('notifier exploded');
    notificationDeliveryService.handleEvent.mockRejectedValue(error);

    await expect(run('event-1')).rejects.toBe(error);
  });
});
