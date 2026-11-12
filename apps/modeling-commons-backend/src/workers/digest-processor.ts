import workersConfig from '#src/config/workers.ts';
import { listDailyCategories } from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import type { SendDigestJobData } from '#src/modules/user-notification/user-notification.events.ts';
import { getDigestWindow } from '#src/modules/user-notification/digest/digest.domain.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const dailyDigestConfig = workersConfig.dailyDigest;
const sendDigestConfig = workersConfig.sendDigest;

type DigestService = Pick<
  Dependencies['notificationDigestService'],
  'queueDigestFor' | 'sendDailyDigest'
>;

export type DailyDigestDependencies = {
  userNotificationRepository: Pick<UserNotificationRepositoryPort, 'findDigestRecipients'>;
  notificationDigestService: Pick<DigestService, 'sendDailyDigest'>;
  logger: FastifyBaseLogger;
};

export async function sendDailyDigests({
  userNotificationRepository,
  notificationDigestService,
  logger,
}: DailyDigestDependencies): Promise<void> {
  const window = getDigestWindow(new Date());
  const dailyByDefault = listDailyCategories([]);

  let recipientCount = 0;
  let failedCount = 0;
  let recipientIds: Array<string> = [];

  do {
    recipientIds = await userNotificationRepository.findDigestRecipients(
      window.since,
      window.until,
      dailyByDefault,
      recipientIds.at(-1) ?? null,
      dailyDigestConfig.recipientBatchSize,
    );
    for (const recipientId of recipientIds) {
      try {
        await notificationDigestService.sendDailyDigest(recipientId, window);
      } catch (error) {
        failedCount += 1;
        logger.error({ err: error, recipientId }, 'Daily digest failed for recipient');
      }
    }
    recipientCount += recipientIds.length;
  } while (recipientIds.length === dailyDigestConfig.recipientBatchSize);

  logger.info({ recipientCount, failedCount }, 'Sent daily notification digests');
  if (failedCount > 0) {
    throw new Error(`Daily digest failed for ${failedCount} of ${recipientCount} recipients`);
  }
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
    notificationDigestService,
  }: { notificationDigestService: Pick<DigestService, 'queueDigestFor'> },
  data: SendDigestJobData,
): Promise<void> {
  const since = parseWindowDate(data.since, data);
  const until = parseWindowDate(data.until, data);
  await notificationDigestService.queueDigestFor(
    data.recipientId,
    { since, until },
    data.categories,
  );
}

export async function startDigestProcessor({
  boss,
  userNotificationRepository,
  notificationDigestService,
  logger,
}: {
  boss: PgBoss;
  userNotificationRepository: DailyDigestDependencies['userNotificationRepository'];
  notificationDigestService: DigestService;
  logger: FastifyBaseLogger;
}): Promise<void> {
  await boss.work(dailyDigestConfig.queueName, async () =>
    sendDailyDigests({ userNotificationRepository, notificationDigestService, logger }),
  );

  await boss.work<SendDigestJobData>(
    sendDigestConfig.queueName,
    {
      localConcurrency: sendDigestConfig.work.localConcurrency,
    },
    async (jobs) => {
      for (const { data } of jobs) {
        await processDigest({ notificationDigestService }, data);
      }
    },
  );

  await boss.schedule(dailyDigestConfig.queueName, dailyDigestConfig.cronExpression, null);

  logger.info('Digest processor scheduled');
}
