import workersConfig from '#src/config/workers.ts';
import type {
  EventJobData,
  EventRepositoryPort,
} from '#src/modules/event/database/event.repository.port.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const config = workersConfig.userNotifications;

export async function startUserNotificationSubscriber({
  boss,
  eventRepository,
  userNotificationService,
  logger,
}: {
  boss: PgBoss;
  eventRepository: EventRepositoryPort;
  userNotificationService: Dependencies['userNotificationService'];
  logger: FastifyBaseLogger;
}): Promise<void> {
  await registerQueue(boss, config);

  await boss.work<EventJobData>(
    config.queueName,
    {
      batchSize: 1,
      localConcurrency: config.work.localConcurrency,
      pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
    },
    async (jobs) => {
      for (const { id: jobId, data } of jobs) {
        const event = await eventRepository.findOneById(data.eventId);
        if (!event) {
          logger.warn({ eventId: data.eventId, jobId }, 'Published event no longer exists');
          continue;
        }
        await userNotificationService.handleEvent(event);
      }
    },
  );

  logger.info('User notification subscriber started');
}
