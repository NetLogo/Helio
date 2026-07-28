import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';

const bossInstance = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue('job-1'),
  stop: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pg-boss', () => ({
  PgBoss: class {
    constructor() {
      return bossInstance;
    }
  },
}));

import { startEventProcessor } from '#src/workers/event-processor.ts';
import { mockEventRepository } from '#src/modules/event/database/event.repository.mock.ts';
import makeEventQueueNotifier from '#src/shared/jobs/event-queue.notifier.ts';
import rules from '#src/config/rules.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

const batchSize = rules.limits.notification.eventBatchSize;

type Deps = Parameters<typeof startEventProcessor>[0];

function makeEventDispatcherService(): { dispatch: ReturnType<typeof vi.fn> } {
  return { dispatch: vi.fn().mockResolvedValue(undefined) };
}

async function start(overrides: Partial<Deps> = {}) {
  const eventRepository = overrides.eventRepository ?? mockEventRepository();
  const eventDispatcherService = overrides.eventDispatcherService ?? makeEventDispatcherService();
  const eventQueueNotifier = overrides.eventQueueNotifier ?? makeEventQueueNotifier();

  const boss = await startEventProcessor({
    connectionString: 'postgres://test',
    eventRepository: eventRepository as unknown as Deps['eventRepository'],
    eventDispatcherService: eventDispatcherService as unknown as Deps['eventDispatcherService'],
    eventQueueNotifier,
    logger,
  });

  const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
  return { boss, handler, eventRepository, eventDispatcherService, eventQueueNotifier };
}

function events(count: number): Array<{ id: string }> {
  return Array.from({ length: count }, (_, index) => ({ id: `event-${index}` }));
}

describe('startEventProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts pg-boss, registers a worker, and schedules the queue', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    const { boss } = await start({ eventRepository: eventRepository as never });

    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    expect(bossInstance.work).toHaveBeenCalledWith('process-events', expect.any(Function));
    expect(bossInstance.schedule).toHaveBeenCalledWith('process-events', '*/1 * * * *');
    expect(boss).toBe(bossInstance);
  });

  it('caps the queue at one waiting job so a burst collapses into one drain', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    await start({ eventRepository: eventRepository as never });

    expect(bossInstance.createQueue).toHaveBeenCalledWith('process-events', { policy: 'short' });
  });

  it('fetches within the configured batch size and attempt ceiling', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    const { handler } = await start({ eventRepository: eventRepository as never });
    await handler();

    expect(eventRepository.findUnprocessed).toHaveBeenCalledWith(
      batchSize,
      rules.limits.notification.maxEventAttempts,
    );
  });

  it('dispatches each unprocessed event, then marks it processed', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    eventRepository.markProcessed.mockResolvedValue(undefined);
    const eventDispatcherService = makeEventDispatcherService();

    const { handler } = await start({
      eventRepository: eventRepository as never,
      eventDispatcherService: eventDispatcherService as never,
    });
    await handler();

    expect(eventDispatcherService.dispatch).toHaveBeenNthCalledWith(1, { id: 'event-1' });
    expect(eventDispatcherService.dispatch).toHaveBeenNthCalledWith(2, { id: 'event-2' });
    expect(eventRepository.markProcessed).toHaveBeenNthCalledWith(1, 'event-1');
    expect(eventRepository.markProcessed).toHaveBeenNthCalledWith(2, 'event-2');
    expect(eventRepository.markFailed).not.toHaveBeenCalled();
  });

  it('marks a failed dispatch and keeps processing the rest of the batch', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    eventRepository.markProcessed.mockResolvedValue(undefined);
    eventRepository.markFailed.mockResolvedValue(undefined);
    const error = new Error('subscriber exploded');
    const eventDispatcherService = makeEventDispatcherService();
    eventDispatcherService.dispatch.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

    const { handler } = await start({
      eventRepository: eventRepository as never,
      eventDispatcherService: eventDispatcherService as never,
    });
    await handler();

    expect(eventRepository.markFailed).toHaveBeenCalledWith('event-1', error);
    expect(eventRepository.markProcessed).not.toHaveBeenCalledWith('event-1');
    expect(eventRepository.markProcessed).toHaveBeenCalledWith('event-2');
  });

  it('keeps draining while a full batch comes back', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.markProcessed.mockResolvedValue(undefined);
    eventRepository.findUnprocessed
      .mockResolvedValueOnce(events(batchSize))
      .mockResolvedValueOnce(events(batchSize))
      .mockResolvedValueOnce(events(3));

    const { handler } = await start({ eventRepository: eventRepository as never });
    await handler();

    expect(eventRepository.findUnprocessed).toHaveBeenCalledTimes(3);
  });

  it('stops draining after the pass ceiling so a poison batch cannot spin forever', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.markProcessed.mockResolvedValue(undefined);
    eventRepository.findUnprocessed.mockResolvedValue(events(batchSize));

    const { handler } = await start({ eventRepository: eventRepository as never });
    await handler();

    expect(eventRepository.findUnprocessed).toHaveBeenCalledTimes(10);
  });

  it('binds the notifier so a nudge sends a drain job', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    const { eventQueueNotifier } = await start({ eventRepository: eventRepository as never });
    await eventQueueNotifier.nudge();

    expect(bossInstance.send).toHaveBeenCalledWith('process-events', {});
  });
});
