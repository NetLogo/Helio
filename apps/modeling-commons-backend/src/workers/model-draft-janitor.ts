import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

const QUEUE_NAME = 'purge-stale-model-drafts';
const STALE_DAYS = 90;
const CRON_EXPRESSION = '0 3 * * 0'; // Sunday 03:00 UTC

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
  await boss.createQueue(QUEUE_NAME);

  await boss.work(QUEUE_NAME, async () => {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const count = await modelDraftService.purgeStale(cutoff);
    logger.info({ cutoff, count }, 'Purged stale model drafts');
  });

  await boss.schedule(QUEUE_NAME, CRON_EXPRESSION);

  logger.info('Model-draft janitor scheduled');
  return boss;
}
