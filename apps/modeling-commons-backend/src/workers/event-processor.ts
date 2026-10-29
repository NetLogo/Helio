import workersConfig from '#src/config/workers.ts';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';
import type { QueueNotifier } from '#src/shared/jobs/queue.notifier.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const config = workersConfig.eventProcessor;

export async function startEventProcessor({
  connectionString,
  eventRepository,
  userNotificationService,
  eventQueueNotifier,
  logger,
}: {
  connectionString: string;
  eventRepository: EventRepositoryPort;
  userNotificationService: Dependencies['userNotificationService'];
  eventQueueNotifier: QueueNotifier;
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);
  const batchSize = config.eventBatchSize;

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  await boss.start();
  await boss.createQueue(config.queueName, { policy: config.queuePolicy });

  async function drainOnce(): Promise<number> {
    const events = await eventRepository.findUnprocessed(batchSize, config.maxEventAttempts);
    for (const event of events) {
      try {
        await userNotificationService.handleEvent(event);
        await eventRepository.markProcessed(event.id);
      } catch (error) {
        await eventRepository.markFailed(event.id, error);
      }
    }
    return events.length;
  }

  await boss.work(config.queueName, async () => {
    let processed = 0;
    for (let pass = 0; pass < config.maxDrainPasses; pass++) {
      const count = await drainOnce();
      processed += count;
      if (count < batchSize) break;
    }
    logger.debug(`Processed ${processed} events`);
  });

  await boss.schedule(config.queueName, config.cronExpression);

  eventQueueNotifier.bind(async () => {
    await boss.send(config.queueName, {});
  });

  logger.info('Event processor started');
  return boss;
}
