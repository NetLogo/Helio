import workersConfig from '#src/config/workers.ts';
import type {
  EventJobData,
  EventRepositoryPort,
} from '#src/modules/event/database/event.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const config = workersConfig.userNotifications;

export async function startUserNotificationSubscriber({
  boss,
  eventRepository,
  notificationDeliveryService,
  logger,
}: {
  boss: PgBoss;
  eventRepository: EventRepositoryPort;
  notificationDeliveryService: Dependencies['notificationDeliveryService'];
  logger: FastifyBaseLogger;
}): Promise<void> {
  await boss.work<EventJobData>(
    config.queueName,
    {
      localConcurrency: config.work.localConcurrency,
    },
    async (jobs) => {
      for (const { id: jobId, data } of jobs) {
        const event = await eventRepository.findOneById(data.eventId);
        if (!event) {
          logger.warn({ eventId: data.eventId, jobId }, 'Published event no longer exists');
          continue;
        }
        await notificationDeliveryService.handleEvent(event);
      }
    },
  );

  logger.info('User notification subscriber started');
}
