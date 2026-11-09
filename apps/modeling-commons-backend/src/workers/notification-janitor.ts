import workersConfig from '#src/config/workers.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

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
  boss,
  ...dependencies
}: NotificationJanitorDependencies & { boss: PgBoss }): Promise<void> {
  await registerQueue(boss, config);

  await boss.work(
    config.queueName,
    { pollingIntervalSeconds: workersConfig.polling.intervalSeconds },
    async () => purgeNotifications(dependencies),
  );

  await boss.schedule(config.queueName, config.cronExpression);

  dependencies.logger.info('Notification janitor scheduled');
}
