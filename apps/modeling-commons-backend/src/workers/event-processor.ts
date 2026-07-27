import rules from '#src/config/rules.ts';
import type makeEventDispatcherService from '#src/modules/event/event-dispatcher.service.ts';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const QUEUE_NAME = 'process-events';
const CRON_EXPRESSION = '*/1 * * * *';

export async function startEventProcessor({
  connectionString,
  eventRepository,
  eventDispatcherService,
  logger,
}: {
  connectionString: string;
  eventRepository: EventRepositoryPort;
  eventDispatcherService: ReturnType<typeof makeEventDispatcherService>;
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  await boss.start();
  await boss.createQueue(QUEUE_NAME);

  await boss.work(QUEUE_NAME, async () => {
    const events = await eventRepository.findUnprocessed(
      rules.limits.notification.eventBatchSize,
      rules.limits.notification.maxEventAttempts,
    );
    for (const event of events) {
      try {
        await eventDispatcherService.dispatch(event);
        await eventRepository.markProcessed(event.id);
      } catch (error) {
        await eventRepository.markFailed(event.id, error);
      }
    }
    logger.debug(`Processed ${events.length} events`);
  });

  await boss.schedule(QUEUE_NAME, CRON_EXPRESSION);

  logger.info('Event processor started');
  return boss;
}
