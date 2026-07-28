import rules from '#src/config/rules.ts';
import type makeEventDispatcherService from '#src/modules/event/event-dispatcher.service.ts';
import type { EventRepositoryPort } from '#src/modules/event/database/event.repository.port.ts';
import type { EventQueueNotifier } from '#src/shared/jobs/event-queue.notifier.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const QUEUE_NAME = 'process-events';
const CRON_EXPRESSION = '*/1 * * * *';

// A drain is a drain: with at most one job queued, a burst of writes collapses into a single
// pass instead of one redundant scan per event. The cron send collapses into it too.
const QUEUE_POLICY = 'short';

// A full batch means more is waiting, so keep going rather than leave it for the next tick.
// Bounded because a batch of poison events keeps coming back until `attempts` catches up.
const MAX_DRAIN_PASSES = 10;

export async function startEventProcessor({
  connectionString,
  eventRepository,
  eventDispatcherService,
  eventQueueNotifier,
  logger,
}: {
  connectionString: string;
  eventRepository: EventRepositoryPort;
  eventDispatcherService: ReturnType<typeof makeEventDispatcherService>;
  eventQueueNotifier: EventQueueNotifier;
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);
  const batchSize = rules.limits.notification.eventBatchSize;

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  await boss.start();
  await boss.createQueue(QUEUE_NAME, { policy: QUEUE_POLICY });

  async function drainOnce(): Promise<number> {
    const events = await eventRepository.findUnprocessed(
      batchSize,
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
    return events.length;
  }

  await boss.work(QUEUE_NAME, async () => {
    let processed = 0;
    for (let pass = 0; pass < MAX_DRAIN_PASSES; pass++) {
      const count = await drainOnce();
      processed += count;
      if (count < batchSize) break;
    }
    logger.debug(`Processed ${processed} events`);
  });

  await boss.schedule(QUEUE_NAME, CRON_EXPRESSION);

  eventQueueNotifier.bind(async () => {
    await boss.send(QUEUE_NAME, {});
  });

  logger.info('Event processor started');
  return boss;
}
