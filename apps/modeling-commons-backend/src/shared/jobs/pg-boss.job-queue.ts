import workersConfig from '#src/config/workers.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import { resolveTransaction } from '#src/shared/db/prisma-transaction.manager.ts';
import type { JobQueue, JobStateRow } from '#src/shared/jobs/job-queue.port.ts';
import { makePrismaBossDb } from '#src/shared/jobs/prisma-boss-db.ts';
import { Prisma } from '#prisma/index';
import type { PgBoss } from 'pg-boss';

const jobTable = Prisma.raw(`${workersConfig.schema}.job`);

export default function makePgBossJobQueue({
  boss,
  db,
}: {
  boss: Pick<PgBoss, 'send' | 'publish'>;
  db: Pick<ExtendedPrismaClient, '$queryRaw'>;
}): JobQueue {
  return {
    async sendTx(ctx, queue, data, options = {}) {
      return boss.send(queue, data, {
        ...options,
        db: makePrismaBossDb(resolveTransaction(ctx)),
      });
    },

    async publish(event, data) {
      await boss.publish(event, data);
    },

    async publishTx(ctx, event, data) {
      // pg-boss publish swallows send errors (Promise.allSettled). A SQL failure still aborts the
      // transaction, but a send that throws before SQL (e.g. a subscription to a deleted queue)
      // commits the event without that job. Accepted: subscriptions only target live queues.
      await boss.publish(event, data, { db: makePrismaBossDb(resolveTransaction(ctx)) });
    },

    async findJobStates(queues, field, values) {
      return db.$queryRaw<Array<JobStateRow>>`
        SELECT data->>${field} AS "value", name AS "queue", state::text AS "state",
          retry_count AS "retryCount", output
        FROM ${jobTable}
        WHERE name = ANY(${queues}::text[]) AND data->>${field} = ANY(${values}::text[])
      `;
    },

    async findJobValues(queue, field, { limit, state }) {
      const stateFilter =
        state === undefined ? Prisma.empty : Prisma.sql`AND state::text = ${state}`;
      const rows = await db.$queryRaw<Array<{ value: string }>>`
        SELECT data->>${field} AS "value"
        FROM ${jobTable}
        WHERE name = ${queue} AND data->>${field} IS NOT NULL ${stateFilter}
        GROUP BY 1
        ORDER BY MAX(created_on) DESC
        LIMIT ${limit}
      `;
      return rows.map((row) => row.value);
    },
  };
}
