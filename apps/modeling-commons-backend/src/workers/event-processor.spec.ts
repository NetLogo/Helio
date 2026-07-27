import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';

const bossInstance = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
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
import rules from '#src/config/rules.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

function makeEventDispatcherService(): { dispatch: ReturnType<typeof vi.fn> } {
  return { dispatch: vi.fn().mockResolvedValue(undefined) };
}

describe('startEventProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts pg-boss, registers a worker, and schedules the queue', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    const boss = await startEventProcessor({
      connectionString: 'postgres://test',
      eventRepository: eventRepository as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventRepository'],
      eventDispatcherService: makeEventDispatcherService() as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventDispatcherService'],
      logger,
    });

    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    expect(bossInstance.work).toHaveBeenCalledWith('process-events', expect.any(Function));
    expect(bossInstance.schedule).toHaveBeenCalledWith('process-events', '*/1 * * * *');
    expect(boss).toBe(bossInstance);
  });

  it('fetches within the configured batch size and attempt ceiling', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([]);

    await startEventProcessor({
      connectionString: 'postgres://test',
      eventRepository: eventRepository as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventRepository'],
      eventDispatcherService: makeEventDispatcherService() as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventDispatcherService'],
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
    await handler();

    expect(eventRepository.findUnprocessed).toHaveBeenCalledWith(
      rules.limits.notification.eventBatchSize,
      rules.limits.notification.maxEventAttempts,
    );
  });

  it('dispatches each unprocessed event, then marks it processed', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    eventRepository.markProcessed.mockResolvedValue(undefined);
    const eventDispatcherService = makeEventDispatcherService();

    await startEventProcessor({
      connectionString: 'postgres://test',
      eventRepository: eventRepository as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventRepository'],
      eventDispatcherService: eventDispatcherService as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventDispatcherService'],
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
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

    await startEventProcessor({
      connectionString: 'postgres://test',
      eventRepository: eventRepository as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventRepository'],
      eventDispatcherService: eventDispatcherService as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventDispatcherService'],
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
    await handler();

    expect(eventRepository.markFailed).toHaveBeenCalledWith('event-1', error);
    expect(eventRepository.markProcessed).not.toHaveBeenCalledWith('event-1');
    expect(eventRepository.markProcessed).toHaveBeenCalledWith('event-2');
  });
});
