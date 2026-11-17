import workersConfig from '#src/config/workers.ts';
import { subtractMs } from '#src/shared/utils/dates.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
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
  const cutoff = subtractMs(new Date(), config.retentionMs);
  const orphanedCount = await userNotificationRepository.deleteOrphaned();
  const expiredCount = await userNotificationRepository.deleteOlderThan(cutoff);
  logger.info({ cutoff, orphanedCount, expiredCount }, 'Purged notifications');
}

export async function startNotificationJanitor({
  boss,
  ...dependencies
}: NotificationJanitorDependencies & { boss: PgBoss }): Promise<void> {
  await boss.work(config.queueName, async () => purgeNotifications(dependencies));

  await boss.schedule(config.queueName, config.cronExpression);

  dependencies.logger.info('Notification janitor scheduled');
}
