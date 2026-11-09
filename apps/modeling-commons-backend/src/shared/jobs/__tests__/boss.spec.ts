import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { ConstructorOptions } from 'pg-boss';

const constructed: Array<ConstructorOptions> = [];
const errorListeners: Array<(error: Error) => void> = [];

vi.mock('#src/config/env.ts', () => ({
  default: { db: { url: 'postgres://shared' } },
}));

vi.mock('pg-boss', () => ({
  PgBoss: class {
    constructor(options: ConstructorOptions) {
      constructed.push(options);
    }
    on(_event: string, listener: (error: Error) => void) {
      errorListeners.push(listener);
    }
  },
}));

import makeBoss from '#src/shared/jobs/boss.ts';

const logger = { error: vi.fn() } as unknown as FastifyBaseLogger;

describe('makeBoss', () => {
  beforeEach(() => {
    constructed.length = 0;
    errorListeners.length = 0;
    vi.clearAllMocks();
  });

  it('gives a worker process the default pool and full maintenance', () => {
    makeBoss({ logger, workersEnabled: true });

    expect(constructed).toEqual([{ connectionString: 'postgres://shared', schema: 'pgboss' }]);
  });

  it('keeps the api process send-only on a two-connection pool', () => {
    makeBoss({ logger, workersEnabled: false });

    expect(constructed).toEqual([
      {
        connectionString: 'postgres://shared',
        schema: 'pgboss',
        max: 2,
        supervise: false,
        schedule: false,
      },
    ]);
  });

  it('logs pg-boss errors', () => {
    const error = new Error('connection lost');

    makeBoss({ logger, workersEnabled: true });
    errorListeners[0]!(error);

    expect(logger.error).toHaveBeenCalledWith(error, 'pg-boss error');
  });
});
