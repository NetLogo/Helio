import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import workersConfig from '#src/config/workers.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  purgeNotifications,
  startNotificationJanitor,
  type NotificationJanitorDependencies,
} from '#src/workers/notification-janitor.ts';

const config = workersConfig.notificationJanitor;
const now = new Date('2026-10-25T04:00:00Z');

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type StoredRow = { id: string; targetId: string | null; createdAt: Date };

function createStore(rows: Array<StoredRow>, liveModelIds: Array<string>) {
  const stored = [...rows];
  const live = new Set(liveModelIds);
  const removeWhere = (predicate: (row: StoredRow) => boolean): number => {
    const before = stored.length;
    stored.splice(0, stored.length, ...stored.filter((row) => !predicate(row)));
    return before - stored.length;
  };
  const userNotificationRepository: NotificationJanitorDependencies['userNotificationRepository'] =
    {
      deleteOrphaned: vi.fn(async () =>
        removeWhere((row) => row.targetId !== null && !live.has(row.targetId)),
      ),
      deleteOlderThan: vi.fn(async (cutoff: Date) =>
        removeWhere((row) => row.createdAt < cutoff),
      ),
    };
  return { userNotificationRepository, listIds: () => stored.map((row) => row.id).sort() };
}

function createRow(id: string, targetId: string | null, ageMs: number): StoredRow {
  return { id, targetId, createdAt: new Date(now.getTime() - ageMs) };
}

describe('purgeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes rows whose target model is gone and keeps rows on a live model', async () => {
    const store = createStore(
      [
        createRow('live', 'model-live', MINUTE_MS),
        createRow('orphan', 'model-gone', MINUTE_MS),
        createRow('untargeted', null, MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeNotifications({ userNotificationRepository: store.userNotificationRepository, logger });

    expect(store.listIds()).toEqual(['live', 'untargeted']);
  });

  it('removes rows older than retentionMs and keeps younger ones', async () => {
    const store = createStore(
      [
        createRow('younger', 'model-live', config.retentionMs - MINUTE_MS),
        createRow('older', 'model-live', config.retentionMs + MINUTE_MS),
      ],
      ['model-live'],
    );

    await purgeNotifications({ userNotificationRepository: store.userNotificationRepository, logger });

    expect(store.listIds()).toEqual(['younger']);
  });

  it('logs how many rows each purge removed', async () => {
    const store = createStore(
      [
        createRow('orphan', 'model-gone', MINUTE_MS),
        createRow('older-a', 'model-live', config.retentionMs + MINUTE_MS),
        createRow('older-b', 'model-live', config.retentionMs + MINUTE_MS * 2),
      ],
      ['model-live'],
    );

    await purgeNotifications({ userNotificationRepository: store.userNotificationRepository, logger });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ orphanedCount: 1, expiredCount: 2 }),
      expect.any(String),
    );
  });
});

describe('startNotificationJanitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a purge when its queue fires on the configured schedule', async () => {
    const store = createStore([createRow('orphan', 'model-gone', MINUTE_MS)], []);

    const boss = await startNotificationJanitor({
      connectionString: 'postgres://test',
      userNotificationRepository: store.userNotificationRepository,
      logger,
    });

    expect(boss).toBe(bossInstance);
    expect(bossInstance.schedule).toHaveBeenCalledWith(config.queueName, config.cronExpression);
    const [queueName, handler] = bossInstance.work.mock.calls[0]! as [string, () => Promise<void>];
    expect(queueName).toBe(config.queueName);
    await handler();
    expect(store.listIds()).toEqual([]);
  });
});
