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

import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import type {
  DigestRow,
  EmailMode,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import {
  sendPendingDigests,
  startDigestProcessor,
  type DigestProcessorDependencies,
} from '#src/workers/digest-processor.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

const batchSize = workersConfig.digestProcessor.recipientBatchSize;

type StoredRow = DigestRow & { recipientId: string; emailSentAt: Date | null };

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
    title: 't',
    url: 'https://example.test',
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

  const userNotificationRepository: DigestProcessorDependencies['userNotificationRepository'] = {
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

function createDailyPreferences(recipientIds: Array<string>): Array<StoredPreference> {
  return recipientIds.map((id) => createPreference(id, 'daily'));
}

function createService(failingRecipientIds: ReadonlySet<string> = new Set()) {
  const sentTo: Array<string> = [];
  const sentRowIds: Array<string> = [];
  const service = {
    sendDigest: vi.fn(
      async (
        recipientId: string,
        rows: ReadonlyArray<DigestRow>,
        _preferences: ReadonlyArray<NotificationPreferenceRecord>,
      ) => {
        if (failingRecipientIds.has(recipientId)) throw new Error(`send to ${recipientId} failed`);
        for (const row of rows as ReadonlyArray<StoredRow>) {
          row.emailSentAt = new Date();
          sentRowIds.push(row.id);
        }
        sentTo.push(recipientId);
      },
    ),
  };
  return { service, sentTo, sentRowIds };
}

function createRecipients(count: number): Array<string> {
  return Array.from({ length: count }, (_, index) => `user-${String(index).padStart(3, '0')}`);
}

const inWindowAgeMs = notificationsConfig.minAgeMs + MINUTE_MS;

describe('sendPendingDigests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads each recipient preferences once per run and hands them to the digest service', async () => {
    const recipients = createRecipients(batchSize + 2);
    const rows = recipients.map((id) => createRow(id, inWindowAgeMs));
    const preferences = createDailyPreferences(recipients);
    const repositories = createRepositories(rows, preferences);
    const { service } = createService();

    await sendPendingDigests({
      ...repositories,
      userNotificationDomain: userNotificationDomain(),
      notificationDigestService: service,
      logger,
    });

    const loadedFor = vi
      .mocked(repositories.notificationPreferenceRepository.findAllByUser)
      .mock.calls.map(([userId]) => userId);
    expect(loadedFor.sort()).toEqual(recipients);
    for (const [recipientId, , passed] of service.sendDigest.mock.calls) {
      expect(passed).toEqual(preferences.filter((entry) => entry.userId === recipientId));
    }
    expect(service.sendDigest).toHaveBeenCalledTimes(recipients.length);
  });

  it('sends one digest to each recipient with pending in-window rows, across pages, and none to others', async () => {
    const recipients = createRecipients(batchSize * 2 + 3);
    const rows = recipients.flatMap((id) => [
      createRow(id, inWindowAgeMs),
      createRow(id, inWindowAgeMs * 2),
    ]);
    rows.push(createRow('user-too-old', notificationsConfig.windowMs + MINUTE_MS));
    rows.push(createRow('user-too-young', notificationsConfig.minAgeMs - MINUTE_MS));
    const preferences = createDailyPreferences([...recipients, 'user-too-old', 'user-too-young']);
    const { service, sentTo } = createService();

    await sendPendingDigests({
      ...createRepositories(rows, preferences),
      userNotificationDomain: userNotificationDomain(),
      notificationDigestService: service,
      logger,
    });

    expect([...sentTo].sort()).toEqual(recipients);
  });

  it('keeps sending to the others when one recipient fails, then throws', async () => {
    const recipients = createRecipients(batchSize * 2);
    const failing = recipients[0]!;
    const rows = recipients.map((id) => createRow(id, inWindowAgeMs));
    const { service, sentTo } = createService(new Set([failing]));

    await expect(
      sendPendingDigests({
        ...createRepositories(rows, createDailyPreferences(recipients)),
        userNotificationDomain: userNotificationDomain(),
        notificationDigestService: service,
        logger,
      }),
    ).rejects.toBeInstanceOf(AggregateError);

    expect([...sentTo].sort()).toEqual(recipients.filter((id) => id !== failing));
  });

  it('emails only rows in categories currently daily for their recipient', async () => {
    const rows = [
      createRow('user-daily', inWindowAgeMs),
      createRow('user-immediate', inWindowAgeMs),
      createRow('user-off', inWindowAgeMs),
      createRow('user-default', inWindowAgeMs),
      createRow('user-mixed', inWindowAgeMs),
      createRow('user-mixed', inWindowAgeMs, 'comment.reply_to_you'),
    ];
    const preferences = [
      createPreference('user-daily', 'daily'),
      createPreference('user-immediate', 'immediate'),
      createPreference('user-off', 'off'),
      createPreference('user-mixed', 'daily'),
      createPreference('user-mixed', 'immediate', 'comment.reply_to_you'),
    ];
    const { service, sentTo, sentRowIds } = createService();

    await sendPendingDigests({
      ...createRepositories(rows, preferences),
      userNotificationDomain: userNotificationDomain(),
      notificationDigestService: service,
      logger,
    });

    expect([...sentTo].sort()).toEqual(['user-daily', 'user-mixed']);
    expect(sentRowIds.sort()).toEqual([rows[0]!.id, rows[4]!.id].sort());
  });

  it('calls the service method present when the job runs, not the one present at startup', async () => {
    const rows = [createRow('user-a', inWindowAgeMs)];
    const service = {
      sendDigest: vi.fn().mockResolvedValue(undefined),
    };
    await startDigestProcessor({
      connectionString: 'postgres://test',
      ...createRepositories(rows, createDailyPreferences(['user-a'])),
      userNotificationDomain: userNotificationDomain(),
      notificationDigestService: service,
      logger,
    });
    const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
    const startupSendDigest = service.sendDigest;
    const replacedSendDigest = vi.fn().mockResolvedValue(undefined);
    service.sendDigest = replacedSendDigest;

    await handler();

    expect(replacedSendDigest).toHaveBeenCalledTimes(1);
    expect(startupSendDigest).not.toHaveBeenCalled();
  });
});
