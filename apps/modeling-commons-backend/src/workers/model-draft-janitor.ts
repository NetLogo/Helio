import workersConfig from '#src/config/workers.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const config = workersConfig.modelDraftJanitor;

export async function startModelDraftJanitor({
  boss,
  modelDraftService,
  logger,
}: {
  boss: PgBoss;
  modelDraftService: {
    purgeStale: (cutoff: Date) => Promise<number>;
  };
  logger: FastifyBaseLogger;
}): Promise<void> {
  await registerQueue(boss, config);

  await boss.work(
    config.queueName,
    { pollingIntervalSeconds: workersConfig.polling.intervalSeconds },
    async () => {
      const cutoff = new Date(Date.now() - config.staleMs);
      const count = await modelDraftService.purgeStale(cutoff);
      logger.info({ cutoff, count }, 'Purged stale model drafts');
    },
  );

  await boss.schedule(config.queueName, config.cronExpression);

  logger.info('Model-draft janitor scheduled');
}
