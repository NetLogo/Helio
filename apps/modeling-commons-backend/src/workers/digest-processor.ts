import workersConfig from '#src/config/workers.ts';
import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import { handleFailedDeliveries } from '#src/modules/user-notification/delivery-failures.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const config = workersConfig.digestProcessor;

export type DigestProcessorDependencies = {
  userNotificationRepository: Pick<
    UserNotificationRepositoryPort,
    'findDigestRecipients' | 'findPendingForRecipient'
  >;
  notificationPreferenceRepository: Pick<NotificationPreferenceRepositoryPort, 'findAllByUser'>;
  userNotificationDomain: Pick<
    Dependencies['userNotificationDomain'],
    'getDigestWindow' | 'listDailyCategories'
  >;
  notificationDigestService: Pick<Dependencies['notificationDigestService'], 'sendDigest'>;
  logger: FastifyBaseLogger;
};

export async function sendPendingDigests({
  userNotificationRepository,
  notificationPreferenceRepository,
  userNotificationDomain,
  notificationDigestService,
  logger,
}: DigestProcessorDependencies): Promise<void> {
  const { since, until } = userNotificationDomain.getDigestWindow(new Date());
  const dailyByDefault = userNotificationDomain.listDailyCategories([]);

  const listRecipientPage = async (afterRecipientId: string | null) =>
    userNotificationRepository.findDigestRecipients(
      since,
      until,
      dailyByDefault,
      afterRecipientId,
      config.recipientBatchSize,
    );

  const sendRecipientDigest = async (recipientId: string) => {
    const preferences = await notificationPreferenceRepository.findAllByUser(recipientId);
    const rows = await userNotificationRepository.findPendingForRecipient(
      recipientId,
      userNotificationDomain.listDailyCategories(preferences),
      since,
      until,
    );
    await notificationDigestService.sendDigest(recipientId, rows, preferences);
  };

  const results: Array<PromiseSettledResult<void>> = [];
  let recipientIds: Array<string> = [];

  do {
    recipientIds = await listRecipientPage(recipientIds.at(-1) ?? null);
    results.push(...(await Promise.allSettled(recipientIds.map(sendRecipientDigest))));
  } while (recipientIds.length === config.recipientBatchSize);

  const recipientCount = results.length;
  const failureCount = results.filter((result) => result.status === 'rejected').length;
  logger.info({ recipientCount, failureCount }, 'Sent notification digests');
  handleFailedDeliveries([{ results, message: 'Failed to send a notification digest' }], logger, {
    name: 'DigestProcessor',
    summary: `${failureCount} of ${recipientCount} notification digests failed`,
  });
}

export async function startDigestProcessor({
  connectionString,
  ...dependencies
}: DigestProcessorDependencies & { connectionString: string }): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    dependencies.logger.error(error, 'pg-boss error (digest processor)');
  });

  await boss.start();
  await boss.createQueue(config.queueName);

  await boss.work(config.queueName, async () => sendPendingDigests(dependencies));

  await boss.schedule(config.queueName, config.cronExpression, null, {
    retryLimit: config.retryLimit,
    retryDelay: config.retryDelaySeconds,
    expireInSeconds: config.expireInSeconds,
  });

  dependencies.logger.info('Digest processor scheduled');
  return boss;
}
