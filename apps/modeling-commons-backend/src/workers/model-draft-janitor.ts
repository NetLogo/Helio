import workersConfig from '#src/config/workers.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const config = workersConfig.modelDraftJanitor;

export async function startModelDraftJanitor({
  connectionString,
  modelDraftService,
  logger,
}: {
  connectionString: string;
  modelDraftService: {
    purgeStale: (cutoff: Date) => Promise<number>;
  };
  logger: FastifyBaseLogger;
}): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error (model-draft janitor)');
  });

  await boss.start();
  await boss.createQueue(config.queueName);

  await boss.work(config.queueName, async () => {
    const cutoff = new Date(Date.now() - config.staleMs);
    const count = await modelDraftService.purgeStale(cutoff);
    logger.info({ cutoff, count }, 'Purged stale model drafts');
  });

  await boss.schedule(config.queueName, config.cronExpression);

  logger.info('Model-draft janitor scheduled');
  return boss;
}
