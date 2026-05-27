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

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

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
      logger,
    });

    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    expect(bossInstance.work).toHaveBeenCalledWith('process-events', expect.any(Function));
    expect(bossInstance.schedule).toHaveBeenCalledWith('process-events', '*/1 * * * *');
    expect(boss).toBe(bossInstance);
  });

  it('marks each unprocessed event as processed when the handler runs', async () => {
    const eventRepository = mockEventRepository();
    eventRepository.findUnprocessed.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);
    eventRepository.markProcessed.mockResolvedValue(undefined);

    await startEventProcessor({
      connectionString: 'postgres://test',
      eventRepository: eventRepository as unknown as Parameters<
        typeof startEventProcessor
      >[0]['eventRepository'],
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
    await handler();

    expect(eventRepository.findUnprocessed).toHaveBeenCalledWith(50);
    expect(eventRepository.markProcessed).toHaveBeenNthCalledWith(1, 'event-1');
    expect(eventRepository.markProcessed).toHaveBeenNthCalledWith(2, 'event-2');
  });
});
