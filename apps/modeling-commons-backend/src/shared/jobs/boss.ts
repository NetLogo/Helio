import env from '#src/config/env.ts';
import workersConfig from '#src/config/workers.ts';
import type { FastifyBaseLogger } from 'fastify';
import { PgBoss } from 'pg-boss';

export default function makeBoss({
  logger,
  workersEnabled,
  schema = workersConfig.schema,
}: {
  logger: FastifyBaseLogger;
  workersEnabled: boolean;
  schema?: string;
}): PgBoss {
  const connection = { connectionString: env.db.url, schema };
  const boss = workersEnabled
    ? new PgBoss(connection)
    : new PgBoss({
        ...connection,
        max: workersConfig.apiPoolSize,
        supervise: false,
        schedule: false,
      });

  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error');
  });

  return boss;
}
