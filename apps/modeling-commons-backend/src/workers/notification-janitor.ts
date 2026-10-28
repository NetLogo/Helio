import workersConfig from '#src/config/workers.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const config = workersConfig.notificationJanitor;

export type NotificationJanitorDependencies = {
  userNotificationRepository: Pick<
    UserNotificationRepositoryPort,
    'deleteOrphaned' | 'deleteOlderThan'
  >;
  logger: FastifyBaseLogger;
};

export async function purgeNotifications({
  userNotificationRepository,
  logger,
}: NotificationJanitorDependencies): Promise<void> {
  const cutoff = new Date(Date.now() - config.retentionMs);
  const orphanedCount = await userNotificationRepository.deleteOrphaned();
  const expiredCount = await userNotificationRepository.deleteOlderThan(cutoff);
  logger.info({ cutoff, orphanedCount, expiredCount }, 'Purged notifications');
}

export async function startNotificationJanitor({
  connectionString,
  ...dependencies
}: NotificationJanitorDependencies & { connectionString: string }): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    dependencies.logger.error(error, 'pg-boss error (notification janitor)');
  });

  await boss.start();
  await boss.createQueue(config.queueName);

  await boss.work(config.queueName, async () => purgeNotifications(dependencies));

  await boss.schedule(config.queueName, config.cronExpression);

  dependencies.logger.info('Notification janitor scheduled');
  return boss;
}
