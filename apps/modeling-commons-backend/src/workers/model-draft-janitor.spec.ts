import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';

const bossInstance = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pg-boss', () => ({
  PgBoss: class {
    constructor() {
      return bossInstance;
    }
  },
}));

import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

describe('startModelDraftJanitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts pg-boss, registers a worker, and schedules the cron', async () => {
    const modelDraftService = { purgeStale: vi.fn().mockResolvedValue(0) };

    const boss = await startModelDraftJanitor({
      connectionString: 'postgres://test',
      modelDraftService,
      logger,
    });

    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    expect(bossInstance.work).toHaveBeenCalledWith(
      'purge-stale-model-drafts',
      expect.any(Function),
    );
    expect(bossInstance.schedule).toHaveBeenCalledWith(
      'purge-stale-model-drafts',
      '0 3 * * 0',
    );
    expect(boss).toBe(bossInstance);
  });

  it('invokes purgeStale with a cutoff 90 days in the past', async () => {
    const modelDraftService = { purgeStale: vi.fn().mockResolvedValue(3) };

    await startModelDraftJanitor({
      connectionString: 'postgres://test',
      modelDraftService,
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
    const before = Date.now();
    await handler();
    const after = Date.now();

    expect(modelDraftService.purgeStale).toHaveBeenCalledTimes(1);
    const cutoff = modelDraftService.purgeStale.mock.calls[0]![0] as Date;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - ninetyDaysMs);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - ninetyDaysMs);
  });
});
