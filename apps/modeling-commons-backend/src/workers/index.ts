import type { FastifyInstance } from 'fastify';
import env from '#src/config/env.ts';
import { startEventProcessor } from '#src/workers/event-processor.ts';
import { startModelDraftJanitor } from '#src/workers/model-draft-janitor.ts';

export async function startWorkers(fastify: FastifyInstance): Promise<void> {
  if (!env.workers.enabled) {
    fastify.log.info({
      name: 'workers',
      message: 'Workers are disabled by configuration, skipping initialization.',
    });
    return;
  }

  const { eventRepository, eventDispatcherService, modelDraftService } =
    fastify.diContainer.cradle;
  const connectionString = env.db.url;

  const [eventBoss, janitorBoss] = await Promise.all([
    startEventProcessor({
      connectionString,
      eventRepository,
      eventDispatcherService,
      logger: fastify.log,
    }),
    startModelDraftJanitor({ connectionString, modelDraftService, logger: fastify.log }),
  ]);

  fastify.addHook('onClose', async () => {
    fastify.log.info({
      name: 'workers',
      message: 'Stopping pg-boss workers…',
    });
    await Promise.allSettled([
      eventBoss.stop({ graceful: true }),
      janitorBoss.stop({ graceful: true }),
    ]);
  });
}
