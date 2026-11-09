import workersConfig from '#src/config/workers.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { JobQueue, JobStateRow } from '#src/shared/jobs/job-queue.port.ts';
import { makePrismaBossDb } from '#src/shared/jobs/prisma-boss-db.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { Db, PgBoss } from 'pg-boss';

const findSubscribedQueuesSql = `
  SELECT name FROM ${workersConfig.schema}.subscription WHERE event = $1
`;

const findJobStatesSql = `
  SELECT data->>$1 AS "value", name AS "queue", state::text AS "state",
    retry_count AS "retryCount", output
  FROM ${workersConfig.schema}.job
  WHERE name = ANY($2::text[]) AND data->>$1 = ANY($3::text[])
`;

const findJobValuesSql = `
  SELECT DISTINCT data->>$1 AS "value"
  FROM ${workersConfig.schema}.job
  WHERE name = $2 AND data->>$1 IS NOT NULL AND ($3::text IS NULL OR state::text = $3::text)
`;

export default function makePgBossJobQueue({
  boss,
  logger,
}: {
  boss: Pick<PgBoss, 'send' | 'getDb'>;
  logger: Pick<FastifyBaseLogger, 'debug'>;
}): JobQueue {
  async function publishThrough(db: Db, event: string, data: object): Promise<Array<string>> {
    const { rows } = await db.executeSql(findSubscribedQueuesSql, [event]);
    const queueNames = (rows as Array<{ name: string }>).map((row) => row.name);
    if (queueNames.length === 0) {
      logger.debug({ event }, 'Published an event that no queue subscribes to');
      return [];
    }

    const jobIds: Array<string> = [];
    for (const queueName of queueNames) {
      const jobId = await boss.send(queueName, data, { db });
      if (!jobId) throw new Error(`No ${queueName} job was created for a ${event} publish`);
      jobIds.push(jobId);
    }
    return jobIds;
  }

  return {
    async send(queue, data, options = {}) {
      return boss.send(queue, data, options);
    },

    async sendTx(ctx, queue, data, options = {}) {
      return boss.send(queue, data, {
        ...options,
        db: makePrismaBossDb(resolveTransaction(ctx)),
      });
    },

    async publish(event, data) {
      return publishThrough(boss.getDb(), event, data);
    },

    async publishTx(ctx, event, data) {
      return publishThrough(makePrismaBossDb(resolveTransaction(ctx)), event, data);
    },

    async findJobStates(queues, field, values) {
      const { rows } = await boss.getDb().executeSql(findJobStatesSql, [field, queues, values]);
      return rows as Array<JobStateRow>;
    },

    async findJobValues(queue, field, state) {
      const { rows } = await boss
        .getDb()
        .executeSql(findJobValuesSql, [field, queue, state ?? null]);
      return (rows as Array<{ value: string }>).map((row) => row.value);
    },
  };
}
