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
const maxEmailAttempts = workersConfig.emailSender.maxEmailAttempts;
const now = new Date('2026-10-25T04:00:00Z');

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type StoredRow = { id: string; targetId: string | null; createdAt: Date };

type StoredEmail = {
  id: string;
  createdAt: Date;
  sentAt: Date | null;
  attempts: number;
  nextAttemptAt: Date | null;
};

function removeWhere<T>(rows: Array<T>, predicate: (row: T) => boolean): number {
  const before = rows.length;
  rows.splice(0, rows.length, ...rows.filter((row) => !predicate(row)));
  return before - rows.length;
}

function createStore(
  rows: Array<StoredRow>,
  liveModelIds: Array<string>,
  emails: Array<StoredEmail> = [],
) {
  const stored = [...rows];
  const storedEmails = [...emails];
  const live = new Set(liveModelIds);
  const userNotificationRepository: NotificationJanitorDependencies['userNotificationRepository'] =
    {
      deleteOrphaned: vi.fn(async () =>
        removeWhere(stored, (row) => row.targetId !== null && !live.has(row.targetId)),
      ),
      deleteOlderThan: vi.fn(async (cutoff: Date) =>
        removeWhere(stored, (row) => row.createdAt < cutoff),
      ),
    };
  const emailQueueRepository: NotificationJanitorDependencies['emailQueueRepository'] = {
    deleteSentBefore: vi.fn(async (cutoff: Date) =>
      removeWhere(storedEmails, (email) => email.sentAt !== null && email.sentAt < cutoff),
    ),
    deleteFailedBefore: vi.fn(async (cutoff: Date, maxAttempts: number) =>
      removeWhere(
        storedEmails,
        (email) =>
          email.sentAt === null &&
          email.attempts >= maxAttempts &&
          (email.nextAttemptAt ?? email.createdAt) < cutoff,
      ),
    ),
  };
  return {
    userNotificationRepository,
    emailQueueRepository,
    listIds: () => stored.map((row) => row.id).sort(),
    listEmailIds: () => storedEmails.map((email) => email.id).sort(),
  };
}

function createRow(id: string, targetId: string | null, ageMs: number): StoredRow {
  return { id, targetId, createdAt: new Date(now.getTime() - ageMs) };
}

function createEmail(
  id: string,
  {
    sentAgeMs,
    failedAgeMs,
    attempts = 0,
  }: { sentAgeMs?: number; failedAgeMs?: number; attempts?: number },
): StoredEmail {
  const ageMs = Math.max(sentAgeMs ?? 0, failedAgeMs ?? 0) + MINUTE_MS;
  return {
    id,
    createdAt: new Date(now.getTime() - ageMs),
    sentAt: sentAgeMs === undefined ? null : new Date(now.getTime() - sentAgeMs),
    attempts,
    nextAttemptAt: failedAgeMs === undefined ? null : new Date(now.getTime() - failedAgeMs),
  };
}

function purgeStore(store: ReturnType<typeof createStore>): Promise<void> {
  return purgeNotifications({
    userNotificationRepository: store.userNotificationRepository,
    emailQueueRepository: store.emailQueueRepository,
    logger,
  });
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

    await purgeStore(store);

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

    await purgeStore(store);

    expect(store.listIds()).toEqual(['younger']);
  });

  it('removes emails sent before sentEmailRetentionMs and keeps later or unsent ones', async () => {
    const store = createStore(
      [],
      [],
      [
        createEmail('sent-recently', { sentAgeMs: config.sentEmailRetentionMs - MINUTE_MS }),
        createEmail('sent-long-ago', { sentAgeMs: config.sentEmailRetentionMs + MINUTE_MS }),
        createEmail('never-tried', {}),
      ],
    );

    await purgeStore(store);

    expect(store.listEmailIds()).toEqual(['never-tried', 'sent-recently']);
  });

  it('removes emails that hit the attempt cap before failedEmailRetentionMs and keeps the rest', async () => {
    const pastRetention = config.failedEmailRetentionMs + MINUTE_MS;
    const store = createStore(
      [],
      [],
      [
        createEmail('capped-recently', {
          failedAgeMs: config.failedEmailRetentionMs - MINUTE_MS,
          attempts: maxEmailAttempts,
        }),
        createEmail('capped-long-ago', { failedAgeMs: pastRetention, attempts: maxEmailAttempts }),
        createEmail('retrying', { failedAgeMs: pastRetention, attempts: maxEmailAttempts - 1 }),
      ],
    );

    await purgeStore(store);

    expect(store.listEmailIds()).toEqual(['capped-recently', 'retrying']);
  });

  it('logs how many rows each purge removed', async () => {
    const store = createStore(
      [
        createRow('orphan', 'model-gone', MINUTE_MS),
        createRow('older-a', 'model-live', config.retentionMs + MINUTE_MS),
        createRow('older-b', 'model-live', config.retentionMs + MINUTE_MS * 2),
      ],
      ['model-live'],
      [
        createEmail('sent-long-ago', { sentAgeMs: config.sentEmailRetentionMs + MINUTE_MS }),
        createEmail('capped-long-ago', {
          failedAgeMs: config.failedEmailRetentionMs + MINUTE_MS,
          attempts: maxEmailAttempts,
        }),
      ],
    );

    await purgeStore(store);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        orphanedCount: 1,
        expiredCount: 2,
        sentEmailCount: 1,
        failedEmailCount: 1,
      }),
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
      emailQueueRepository: store.emailQueueRepository,
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
