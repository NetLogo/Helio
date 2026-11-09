import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const bossInstance = {
  send: vi.fn().mockResolvedValue('job-id'),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { mockNotificationProducer } from '#src/modules/user-notification/domain/notification-producer.mock.ts';
import type {
  NotificationRow,
  EmailMode,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import { DAY_S, MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  processDigest,
  queuePendingDigests,
  startDigestProcessor,
  type DigestFanOutDependencies,
  type DigestProcessorDependencies,
  type SendDigestJobData,
} from '#src/workers/digest-processor.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

const fanOutConfig = workersConfig.queueNotificationDigests;
const sendDigestConfig = workersConfig.sendDigest;
const batchSize = fanOutConfig.recipientBatchSize;

type StoredRow = NotificationRow & { recipientId: string; emailSentAt: Date | null };

type StoredPreference = { userId: string; category: string; email: EmailMode; inApp: boolean };

function createRow(
  recipientId: string,
  ageMs: number,
  category = 'comment.on_your_model',
): StoredRow {
  return {
    id: `${recipientId}-${category}-${ageMs}`,
    recipientId,
    category,
    url: 'https://example.test',
    payload: {},
    actorUserId: null,
    targetType: null,
    targetId: null,
    createdAt: new Date(Date.now() - ageMs),
    emailSentAt: null,
  };
}

function createPreference(
  userId: string,
  email: EmailMode,
  category = 'comment.on_your_model',
): StoredPreference {
  return { userId, category, email, inApp: true };
}

function isPendingIn(row: StoredRow, since: Date, until: Date): boolean {
  return row.emailSentAt === null && row.createdAt >= since && row.createdAt <= until;
}

function createRepositories(rows: Array<StoredRow>, preferences: Array<StoredPreference>) {
  function isDaily(row: StoredRow, dailyByDefault: Array<string>): boolean {
    const preference = preferences.find(
      (entry) => entry.userId === row.recipientId && entry.category === row.category,
    );
    return preference ? preference.email === 'daily' : dailyByDefault.includes(row.category);
  }

  const userNotificationRepository: DigestFanOutDependencies['userNotificationRepository'] &
    DigestProcessorDependencies['userNotificationRepository'] = {
    findDigestRecipients: vi.fn(
      async (
        since: Date,
        until: Date,
        dailyByDefault: Array<string>,
        afterRecipientId: string | null,
        limit: number,
      ) =>
        [
          ...new Set(
            rows
              .filter((row) => isPendingIn(row, since, until) && isDaily(row, dailyByDefault))
              .map((row) => row.recipientId),
          ),
        ]
          .sort()
          .filter((id) => afterRecipientId === null || id > afterRecipientId)
          .slice(0, limit),
    ),
    findPendingForRecipient: vi.fn(
      async (recipientId: string, categories: Array<string>, since: Date, until: Date) =>
        rows.filter(
          (row) =>
            row.recipientId === recipientId &&
            categories.includes(row.category) &&
            isPendingIn(row, since, until),
        ) as unknown as Awaited<
          ReturnType<
            DigestProcessorDependencies['userNotificationRepository']['findPendingForRecipient']
          >
        >,
    ),
  };
  const notificationPreferenceRepository: DigestProcessorDependencies['notificationPreferenceRepository'] =
    {
      findAllByUser: vi.fn(
        async (userId: string) =>
          preferences.filter((entry) => entry.userId === userId) as unknown as Awaited<
            ReturnType<
              DigestProcessorDependencies['notificationPreferenceRepository']['findAllByUser']
            >
          >,
      ),
    };
  return { userNotificationRepository, notificationPreferenceRepository };
}

function createService() {
  const sentRowIds: Array<string> = [];
  const service = {
    queueDigest: vi.fn(
      async (
        _recipientId: string,
        rows: ReadonlyArray<NotificationRow>,
        _preferences: ReadonlyArray<NotificationPreferenceRecord>,
      ) => {
        for (const row of rows as ReadonlyArray<StoredRow>) {
          row.emailSentAt = new Date();
          sentRowIds.push(row.id);
        }
      },
    ),
  };
  return { service, sentRowIds };
}

function createRecipients(count: number): Array<string> {
  return Array.from({ length: count }, (_, index) => `user-${String(index).padStart(3, '0')}`);
}

function fanOut(rows: Array<StoredRow>) {
  const dailyPreferences = [...new Set(rows.map((row) => row.recipientId))].map((id) =>
    createPreference(id, 'daily'),
  );
  const { userNotificationRepository } = createRepositories(rows, dailyPreferences);
  return queuePendingDigests({
    boss,
    userNotificationRepository,
    userNotificationDomain: userNotificationDomain({
      notificationProducers: [mockNotificationProducer()],
    }),
    logger,
  });
}

function listSentRecipientIds(): Array<string> {
  return bossInstance.send.mock.calls
    .map(([, data]) => (data as SendDigestJobData).recipientId)
    .sort();
}

function createWindow(): { since: string; until: string } {
  const { since, until } = userNotificationDomain({
    notificationProducers: [mockNotificationProducer()],
  }).getDigestWindow(new Date());
  return { since: since.toISOString(), until: until.toISOString() };
}

const inWindowAgeMs = notificationsConfig.minAgeMs + MINUTE_MS;

describe('queuePendingDigests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bossInstance.send.mockResolvedValue('job-id');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends one send-digest job per pending recipient, across pages, and none to others', async () => {
    const recipients = createRecipients(batchSize * 2 + 3);
    const rows = recipients.flatMap((id) => [
      createRow(id, inWindowAgeMs),
      createRow(id, inWindowAgeMs * 2),
    ]);
    rows.push(createRow('user-too-old', notificationsConfig.windowMs + MINUTE_MS));
    rows.push(createRow('user-too-young', notificationsConfig.minAgeMs - MINUTE_MS));

    await fanOut(rows);

    expect(listSentRecipientIds()).toEqual(recipients);
  });

  it('keys each job by recipient and UTC day of the window end, deduplicated for a day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T17:00:00Z'));
    const window = createWindow();

    await fanOut([createRow('user-a', inWindowAgeMs)]);

    expect(bossInstance.send).toHaveBeenCalledExactlyOnceWith(
      sendDigestConfig.queueName,
      { recipientId: 'user-a', ...window },
      { singletonKey: `user-a:${window.until.slice(0, 10)}`, singletonSeconds: DAY_S },
    );
    expect(window.until.slice(0, 10)).toBe('2026-11-02');
  });

  it('keeps sending to the others when one send fails, then rejects so the deduplicated run retries', async () => {
    const recipients = createRecipients(batchSize + 2);
    const failing = recipients[0]!;
    bossInstance.send.mockImplementation(async (_name: string, data: SendDigestJobData) => {
      if (data.recipientId === failing) throw new Error('send failed');
      return 'job-id';
    });

    await expect(fanOut(recipients.map((id) => createRow(id, inWindowAgeMs)))).rejects.toThrow(
      '1 digest sends failed',
    );

    expect(listSentRecipientIds()).toEqual(recipients);
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: failing }),
      expect.any(String),
    );
  });

  it('throws when listing recipients fails', async () => {
    const error = new Error('query failed');

    await expect(
      queuePendingDigests({
        boss,
        userNotificationRepository: { findDigestRecipients: vi.fn().mockRejectedValue(error) },
        userNotificationDomain: userNotificationDomain({
          notificationProducers: [mockNotificationProducer()],
        }),
        logger,
      }),
    ).rejects.toBe(error);
    expect(bossInstance.send).not.toHaveBeenCalled();
  });
});

describe('processDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hands the recipient pending rows in categories currently daily and their preferences to queueDigest', async () => {
    const rows = [
      createRow('user-mixed', inWindowAgeMs),
      createRow('user-mixed', inWindowAgeMs, 'comment.reply_to_you'),
      createRow('user-mixed', notificationsConfig.windowMs + MINUTE_MS),
      createRow('user-other', inWindowAgeMs),
    ];
    const preferences = [
      createPreference('user-mixed', 'daily'),
      createPreference('user-mixed', 'immediate', 'comment.reply_to_you'),
      createPreference('user-other', 'daily'),
    ];
    const { service, sentRowIds } = createService();

    await processDigest(
      {
        ...createRepositories(rows, preferences),
        userNotificationDomain: userNotificationDomain({
          notificationProducers: [mockNotificationProducer()],
        }),
        notificationDigestService: service,
      },
      { recipientId: 'user-mixed', ...createWindow() },
    );

    expect(sentRowIds).toEqual([rows[0]!.id]);
    expect(service.queueDigest).toHaveBeenCalledExactlyOnceWith(
      'user-mixed',
      [rows[0]],
      preferences.filter((entry) => entry.userId === 'user-mixed'),
    );
  });

  it.each([
    ['since', { since: 'not-a-date', until: new Date().toISOString() }],
    ['until', { since: new Date().toISOString(), until: 'not-a-date' }],
  ])(
    'rejects job data with an invalid %s, naming the data, before reading anything',
    async (_field, window) => {
      const repositories = createRepositories([createRow('user-a', inWindowAgeMs)], []);
      const queueDigest = vi.fn().mockResolvedValue(undefined);
      const data = { recipientId: 'user-a', ...window };

      await expect(
        processDigest(
          {
            ...repositories,
            userNotificationDomain: userNotificationDomain({
              notificationProducers: [mockNotificationProducer()],
            }),
            notificationDigestService: { queueDigest },
          },
          data,
        ),
      ).rejects.toThrow(JSON.stringify(data));
      expect(
        repositories.userNotificationRepository.findPendingForRecipient,
      ).not.toHaveBeenCalled();
      expect(queueDigest).not.toHaveBeenCalled();
    },
  );

  it('lets a queueDigest error propagate so pg-boss retries that recipient', async () => {
    const error = new Error('enqueue failed');

    await expect(
      processDigest(
        {
          ...createRepositories([createRow('user-a', inWindowAgeMs)], []),
          userNotificationDomain: userNotificationDomain({
            notificationProducers: [mockNotificationProducer()],
          }),
          notificationDigestService: { queueDigest: vi.fn().mockRejectedValue(error) },
        },
        { recipientId: 'user-a', ...createWindow() },
      ),
    ).rejects.toBe(error);
  });
});

describe('startDigestProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function start(service = { queueDigest: vi.fn().mockResolvedValue(undefined) }) {
    await startDigestProcessor({
      boss,
      ...createRepositories([createRow('user-a', inWindowAgeMs)], []),
      userNotificationDomain: userNotificationDomain({
        notificationProducers: [mockNotificationProducer()],
      }),
      notificationDigestService: service,
      logger,
    });
    const sendDigestCall = bossInstance.work.mock.calls.find(
      ([name]) => name === sendDigestConfig.queueName,
    )!;
    const handler = sendDigestCall[2] as (
      jobs: Array<{ id: string; data: SendDigestJobData }>,
    ) => Promise<void>;
    return { sendDigestCall, handler, service };
  }

  it('registers both queues with their dead letters', async () => {
    await start();

    for (const entry of [fanOutConfig, sendDigestConfig]) {
      expect(bossInstance.createQueue).toHaveBeenCalledWith(entry.queueName, {
        ...entry.queue,
        deadLetter: getDeadLetterQueueName(entry.queueName),
      });
    }
  });

  it('schedules the fan-out cron with its queue options', async () => {
    await start();

    expect(bossInstance.schedule).toHaveBeenCalledExactlyOnceWith(
      'queue-notification-digests',
      fanOutConfig.cronExpression,
      null,
      fanOutConfig.queue,
    );
  });

  it('works send-digest one job at a time with local concurrency', async () => {
    const { sendDigestCall } = await start();

    expect(sendDigestCall[1]).toEqual({
      batchSize: 1,
      localConcurrency: sendDigestConfig.work.localConcurrency,
      pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
    });
  });

  it('calls the service method present when the job runs, not the one present at startup', async () => {
    const { handler, service } = await start();
    const startupQueueDigest = service.queueDigest;
    const replacedQueueDigest = vi.fn().mockResolvedValue(undefined);
    service.queueDigest = replacedQueueDigest;

    await handler([{ id: 'job-1', data: { recipientId: 'user-a', ...createWindow() } }]);

    expect(replacedQueueDigest).toHaveBeenCalledOnce();
    expect(startupQueueDigest).not.toHaveBeenCalled();
  });
});
