import workersConfig from '#src/config/workers.ts';
import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const fanOutConfig = workersConfig.queueNotificationDigests;
const sendDigestConfig = workersConfig.sendDigest;

export type SendDigestJobData = { recipientId: string; since: string; until: string };

export type DigestFanOutDependencies = {
  boss: Pick<PgBoss, 'send'>;
  userNotificationRepository: Pick<UserNotificationRepositoryPort, 'findDigestRecipients'>;
  userNotificationDomain: Pick<
    Dependencies['userNotificationDomain'],
    'getDigestWindow' | 'listDailyCategories'
  >;
  logger: FastifyBaseLogger;
};

export type DigestProcessorDependencies = {
  userNotificationRepository: Pick<UserNotificationRepositoryPort, 'findPendingForRecipient'>;
  notificationPreferenceRepository: Pick<NotificationPreferenceRepositoryPort, 'findAllByUser'>;
  userNotificationDomain: Pick<Dependencies['userNotificationDomain'], 'listDailyCategories'>;
  notificationDigestService: Pick<Dependencies['notificationDigestService'], 'queueDigest'>;
};

export async function queuePendingDigests({
  boss,
  userNotificationRepository,
  userNotificationDomain,
  logger,
}: DigestFanOutDependencies): Promise<void> {
  const { since, until } = userNotificationDomain.getDigestWindow(new Date());
  const dailyByDefault = userNotificationDomain.listDailyCategories([]);
  const window = { since: since.toISOString(), until: until.toISOString() };
  const utcDay = window.until.slice(0, 10);

  const listRecipientPage = async (afterRecipientId: string | null) =>
    userNotificationRepository.findDigestRecipients(
      since,
      until,
      dailyByDefault,
      afterRecipientId,
      fanOutConfig.recipientBatchSize,
    );

  const sendRecipientDigest = async (recipientId: string) =>
    boss
      .send(sendDigestConfig.queueName, { recipientId, ...window } satisfies SendDigestJobData, {
        singletonKey: `${recipientId}:${utcDay}`,
        singletonSeconds: sendDigestConfig.singletonSeconds,
      })
      .then(
        () => true,
        (error: unknown) => {
          logger.error({ recipientId, error }, 'Failed to send a digest job');
          return false;
        },
      );

  let recipientCount = 0;
  let failureCount = 0;
  let recipientIds: Array<string> = [];

  do {
    recipientIds = await listRecipientPage(recipientIds.at(-1) ?? null);
    const sent = await Promise.all(recipientIds.map(sendRecipientDigest));
    failureCount += sent.filter((isSent) => !isSent).length;
    recipientCount += recipientIds.length;
  } while (recipientIds.length === fanOutConfig.recipientBatchSize);

  logger.info({ recipientCount, failureCount, utcDay }, 'Fanned out notification digests');
  if (failureCount > 0) throw new Error(`${failureCount} digest sends failed`);
}

function parseWindowDate(value: string, data: SendDigestJobData): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid send-digest window in job data ${JSON.stringify(data)}`);
  }
  return date;
}

export async function processDigest(
  {
    userNotificationRepository,
    notificationPreferenceRepository,
    userNotificationDomain,
    notificationDigestService,
  }: DigestProcessorDependencies,
  data: SendDigestJobData,
): Promise<void> {
  const { recipientId } = data;
  const since = parseWindowDate(data.since, data);
  const until = parseWindowDate(data.until, data);
  const preferences = await notificationPreferenceRepository.findAllByUser(recipientId);
  const rows = await userNotificationRepository.findPendingForRecipient(
    recipientId,
    userNotificationDomain.listDailyCategories(preferences),
    since,
    until,
  );
  await notificationDigestService.queueDigest(recipientId, rows, preferences);
}

export async function startDigestProcessor({
  boss,
  userNotificationRepository,
  notificationPreferenceRepository,
  userNotificationDomain,
  notificationDigestService,
  logger,
}: {
  boss: PgBoss;
  userNotificationRepository: DigestFanOutDependencies['userNotificationRepository'] &
    DigestProcessorDependencies['userNotificationRepository'];
  notificationPreferenceRepository: DigestProcessorDependencies['notificationPreferenceRepository'];
  userNotificationDomain: DigestFanOutDependencies['userNotificationDomain'];
  notificationDigestService: DigestProcessorDependencies['notificationDigestService'];
  logger: FastifyBaseLogger;
}): Promise<void> {
  await registerQueue(boss, fanOutConfig);
  await registerQueue(boss, sendDigestConfig);

  await boss.work(
    fanOutConfig.queueName,
    { batchSize: 1, pollingIntervalSeconds: workersConfig.polling.intervalSeconds },
    async () =>
      queuePendingDigests({ boss, userNotificationRepository, userNotificationDomain, logger }),
  );

  await boss.work<SendDigestJobData>(
    sendDigestConfig.queueName,
    {
      batchSize: 1,
      localConcurrency: sendDigestConfig.work.localConcurrency,
      pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
    },
    async (jobs) => {
      for (const { data } of jobs) {
        await processDigest(
          {
            userNotificationRepository,
            notificationPreferenceRepository,
            userNotificationDomain,
            notificationDigestService,
          },
          data,
        );
      }
    },
  );

  await boss.schedule(
    fanOutConfig.queueName,
    fanOutConfig.cronExpression,
    null,
    fanOutConfig.queue,
  );

  logger.info('Digest processor scheduled');
}
