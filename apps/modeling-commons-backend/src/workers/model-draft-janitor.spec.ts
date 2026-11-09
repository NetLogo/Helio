import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const bossInstance = {
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

import workersConfig from '#src/config/workers.ts';
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

  it('registers a worker on the shared boss and schedules the cron', async () => {
    const modelDraftService = { purgeStale: vi.fn().mockResolvedValue(0) };

    await startModelDraftJanitor({
      boss,
      modelDraftService,
      logger,
    });

    expect(bossInstance.work).toHaveBeenCalledWith(
      'purge-stale-model-drafts',
      { pollingIntervalSeconds: workersConfig.polling.intervalSeconds },
      expect.any(Function),
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith('purge-stale-model-drafts', {
      ...workersConfig.modelDraftJanitor.queue,
      deadLetter: 'purge-stale-model-drafts-dead',
    });
    expect(bossInstance.schedule).toHaveBeenCalledWith('purge-stale-model-drafts', '0 3 * * 0');
  });

  it('invokes purgeStale with a cutoff 90 days in the past', async () => {
    const modelDraftService = { purgeStale: vi.fn().mockResolvedValue(3) };

    await startModelDraftJanitor({
      boss,
      modelDraftService,
      logger,
    });

    const handler = bossInstance.work.mock.calls[0]![2] as () => Promise<void>;
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
