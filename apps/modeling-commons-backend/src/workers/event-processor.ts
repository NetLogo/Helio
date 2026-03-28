import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const QUEUE_NAME = 'process-events';
const BATCH_SIZE = 50;

export async function startEventProcessor({
  connectionString,
  eventRepository,
  logger,
}: {
  connectionString: string;
  eventRepository: EventRepositoryPort;
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  await boss.start();

  await boss.work(QUEUE_NAME, async () => {
    const events = await eventRepository.findUnprocessed(BATCH_SIZE);
    for (const event of events) {
      // Future: dispatch side effects based on event.type
      await eventRepository.markProcessed(event.id);
    }
    logger.debug(`Processed ${events.length} events`);
  });

  logger.info('Event processor started');
  return boss;
}
