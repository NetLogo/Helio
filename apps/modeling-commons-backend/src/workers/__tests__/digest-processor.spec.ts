import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const bossInstance = {
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';
import { getDigestWindow } from '#src/modules/user-notification/digest/digest.domain.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  processDigest,
  sendDailyDigests,
  startDigestProcessor,
  type DailyDigestDependencies,
} from '#src/workers/digest-processor.ts';
import type { SendDigestJobData } from '#src/modules/user-notification/user-notification.events.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

const dailyDigestConfig = workersConfig.dailyDigest;
const sendDigestConfig = workersConfig.sendDigest;
const batchSize = dailyDigestConfig.recipientBatchSize;

type StoredNotification = {
  id: string;
  recipientId: string;
  category: NotificationCategory;
  createdAt: Date;
};

function createNotification(
  recipientId: string,
  ageMs: number,
  category: NotificationCategory = 'comment.on_your_model',
): StoredNotification {
  return {
    id: `${recipientId}-${category}-${ageMs}`,
    recipientId,
    category,
    createdAt: new Date(Date.now() - ageMs),
  };
}

function isPendingIn(notification: StoredNotification, since: Date, until: Date): boolean {
  return notification.createdAt >= since && notification.createdAt <= until;
}

function createRepository(
  notifications: Array<StoredNotification>,
): DailyDigestDependencies['userNotificationRepository'] {
  return {
    findDigestRecipients: vi.fn(
      async (
        since: Date,
        until: Date,
        _dailyByDefault: Array<string>,
        afterRecipientId: string | null,
        limit: number,
      ) =>
        [
          ...new Set(
            notifications
              .filter((notification) => isPendingIn(notification, since, until))
              .map((notification) => notification.recipientId),
          ),
        ]
          .sort()
          .filter((id) => afterRecipientId === null || id > afterRecipientId)
          .slice(0, limit),
    ),
  };
}

function createService() {
  return {
    queueDigestFor: vi.fn().mockResolvedValue(undefined),
    sendDailyDigest: vi.fn().mockResolvedValue(undefined),
  };
}

function createRecipients(count: number): Array<string> {
  return Array.from({ length: count }, (_, index) => `user-${String(index).padStart(3, '0')}`);
}

function runDailyDigests(
  notifications: Array<StoredNotification>,
  service: DailyDigestDependencies['notificationDigestService'] = createService(),
) {
  return sendDailyDigests({
    userNotificationRepository: createRepository(notifications),
    notificationDigestService: service,
    logger,
  });
}

function listDigestRecipientIds(service: ReturnType<typeof createService>): Array<string> {
  return service.sendDailyDigest.mock.calls.map(([recipientId]) => recipientId as string).sort();
}

function createWindow(): { since: string; until: string } {
  const { since, until } = getDigestWindow(new Date());
  return { since: since.toISOString(), until: until.toISOString() };
}

const inWindowAgeMs = notificationsConfig.minAgeMs + MINUTE_MS;

describe('sendDailyDigests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends one digest per pending recipient across every page, and none to others', async () => {
    const service = createService();
    const recipients = createRecipients(batchSize * 2 + 3);
    const notifications = recipients.flatMap((id) => [
      createNotification(id, inWindowAgeMs),
      createNotification(id, inWindowAgeMs * 2),
    ]);
    notifications.push(
      createNotification('user-too-old', notificationsConfig.windowMs + MINUTE_MS),
    );
    notifications.push(
      createNotification('user-too-young', notificationsConfig.minAgeMs - MINUTE_MS),
    );

    await runDailyDigests(notifications, service);

    expect(listDigestRecipientIds(service)).toEqual(recipients);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ recipientCount: recipients.length, failedCount: 0 }),
      expect.any(String),
    );
  });

  it('sends each recipient the digest window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T17:00:00Z'));
    const service = createService();

    await runDailyDigests([createNotification('user-a', inWindowAgeMs)], service);

    expect(service.sendDailyDigest).toHaveBeenCalledExactlyOnceWith(
      'user-a',
      getDigestWindow(new Date()),
    );
  });

  it('sends nothing when no recipient is pending', async () => {
    const service = createService();

    await runDailyDigests([], service);

    expect(service.sendDailyDigest).not.toHaveBeenCalled();
  });

  it('keeps sending to the other recipients when one fails, then rejects so the run retries', async () => {
    const service = createService();
    service.sendDailyDigest.mockImplementation(async (recipientId: string) => {
      if (recipientId === 'user-a') throw new Error('enqueue failed');
    });

    await expect(
      runDailyDigests(
        [createNotification('user-a', inWindowAgeMs), createNotification('user-b', inWindowAgeMs)],
        service,
      ),
    ).rejects.toThrow('1 of 2');

    expect(listDigestRecipientIds(service)).toEqual(['user-a', 'user-b']);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'user-a' }),
      expect.any(String),
    );
  });

  it('throws when listing recipients fails', async () => {
    const error = new Error('query failed');
    const service = createService();

    await expect(
      sendDailyDigests({
        userNotificationRepository: { findDigestRecipients: vi.fn().mockRejectedValue(error) },
        notificationDigestService: service,
        logger,
      }),
    ).rejects.toBe(error);
    expect(service.sendDailyDigest).not.toHaveBeenCalled();
  });
});

describe('processDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues a digest of the categories the job carries over its window', async () => {
    const service = createService();
    const window = createWindow();

    await processDigest(
      { notificationDigestService: service },
      { recipientId: 'user-a', ...window, categories: ['comment.reply_to_you'] },
    );

    expect(service.queueDigestFor).toHaveBeenCalledExactlyOnceWith(
      'user-a',
      { since: new Date(window.since), until: new Date(window.until) },
      ['comment.reply_to_you'],
    );
  });

  it.each([
    ['since', { since: 'not-a-date', until: new Date().toISOString() }],
    ['until', { since: new Date().toISOString(), until: 'not-a-date' }],
  ])(
    'rejects job data with an invalid %s, naming the data, before queueing',
    async (_field, window) => {
      const service = createService();
      const data: SendDigestJobData = {
        recipientId: 'user-a',
        ...window,
        categories: ['comment.reply_to_you'],
      };

      await expect(processDigest({ notificationDigestService: service }, data)).rejects.toThrow(
        JSON.stringify(data),
      );
      expect(service.queueDigestFor).not.toHaveBeenCalled();
    },
  );

  it('lets a digest error propagate so pg-boss retries that recipient', async () => {
    const error = new Error('enqueue failed');
    const service = { ...createService(), queueDigestFor: vi.fn().mockRejectedValue(error) };

    await expect(
      processDigest(
        { notificationDigestService: service },
        { recipientId: 'user-a', ...createWindow(), categories: ['comment.reply_to_you'] },
      ),
    ).rejects.toBe(error);
  });
});

describe('startDigestProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function start(service = createService()) {
    await startDigestProcessor({
      boss,
      userNotificationRepository: createRepository([createNotification('user-a', inWindowAgeMs)]),
      notificationDigestService: service,
      logger,
    });
    const findHandler = (queueName: string) =>
      bossInstance.work.mock.calls.find(([name]) => name === queueName)!;
    return { findHandler, service };
  }

  it('schedules the daily digest cron, leaving queue options to the queue', async () => {
    await start();

    expect(bossInstance.schedule).toHaveBeenCalledExactlyOnceWith(
      'send-daily-digests',
      dailyDigestConfig.cronExpression,
      null,
    );
  });

  it('works send-digest one job at a time with local concurrency', async () => {
    const { findHandler } = await start();

    expect(findHandler(sendDigestConfig.queueName)[1]).toEqual({
      localConcurrency: sendDigestConfig.work.localConcurrency,
    });
  });

  it('sends the daily digests when the cron job runs, through the service method present then', async () => {
    const { findHandler, service } = await start();
    const startupSendDailyDigest = service.sendDailyDigest;
    const replacedSendDailyDigest = vi.fn().mockResolvedValue(undefined);
    service.sendDailyDigest = replacedSendDailyDigest;
    const handler = findHandler(dailyDigestConfig.queueName)[1] as () => Promise<void>;

    await handler();

    expect(replacedSendDailyDigest).toHaveBeenCalledExactlyOnceWith('user-a', expect.any(Object));
    expect(startupSendDailyDigest).not.toHaveBeenCalled();
  });
});
