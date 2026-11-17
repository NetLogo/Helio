import { describe, it, expect, vi } from 'vitest';
import type { Db, PgBoss } from 'pg-boss';
import { Prisma } from '#prisma/index';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import makePgBossJobQueue from '#src/shared/jobs/pg-boss.job-queue.ts';

function makeBossStub() {
  const boss = {
    send: vi.fn().mockResolvedValue('job-1'),
    publish: vi.fn().mockResolvedValue(undefined),
  };
  const db = { $queryRaw: vi.fn().mockResolvedValue([]) };
  const jobQueue = makePgBossJobQueue({
    boss: boss as unknown as PgBoss,
    db: db as unknown as ExtendedPrismaClient,
  });
  return { boss, db, jobQueue };
}

function capturedQuery(queryRaw: { mock: { calls: Array<Array<unknown>> } }) {
  const [strings, ...values] = queryRaw.mock.calls[0]!;
  return Prisma.sql(strings as unknown as TemplateStringsArray, ...values);
}

function makeTransactionManager(tx: object) {
  const db = {
    $transaction: async (fn: (client: object) => Promise<unknown>) => fn(tx),
  } as unknown as ExtendedPrismaClient;
  return makePrismaTransactionManager({ db });
}

describe('pgBossJobQueue', () => {
  it('inserts a transactional send through the open transaction', async () => {
    const rows = [{ id: 'job-2' }];
    const tx = { $queryRawUnsafe: vi.fn().mockResolvedValue(rows) };
    const { boss, jobQueue } = makeBossStub();
    boss.send.mockImplementation(async (_queue: string, _data: object, options: { db: Db }) =>
      options.db.executeSql('INSERT $1 $2', ['first', 'second']),
    );

    const result = await makeTransactionManager(tx).run(async (ctx) =>
      jobQueue.sendTx(ctx, 'probe', { a: 1 }, { retryLimit: 2 }),
    );

    expect(boss.send).toHaveBeenCalledWith(
      'probe',
      { a: 1 },
      expect.objectContaining({ retryLimit: 2, db: expect.any(Object) }),
    );
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith('INSERT $1 $2', 'first', 'second');
    expect(result).toEqual({ rows });
  });

  it('rejects a transactional send with a context that is not open', async () => {
    const { boss, jobQueue } = makeBossStub();
    let closedCtx: Parameters<typeof jobQueue.sendTx>[0] | undefined;
    await makeTransactionManager({}).run(async (ctx) => {
      closedCtx = ctx;
    });

    await expect(jobQueue.sendTx(closedCtx!, 'probe', {})).rejects.toThrow(
      'Invalid transaction context',
    );
    expect(boss.send).not.toHaveBeenCalled();
  });

  it('looks job states up in the given queues', async () => {
    const rows = [
      { value: 'e1', queue: 'probe', state: 'completed', retryCount: 0, output: null },
      { value: 'e2', queue: 'probe-graveyard', state: 'created', retryCount: 0, output: { a: 1 } },
    ];
    const { db, jobQueue } = makeBossStub();
    db.$queryRaw.mockResolvedValue(rows);

    const result = await jobQueue.findJobStates(['probe', 'probe-graveyard'], 'eventId', [
      'e1',
      'e2',
    ]);

    const query = capturedQuery(db.$queryRaw);
    expect(query.sql).toContain('FROM pgboss.job');
    expect(query.values).toEqual([
      'eventId',
      ['probe', 'probe-graveyard'],
      'eventId',
      ['e1', 'e2'],
    ]);
    expect(result).toEqual(rows);
  });

  it('lists the field values of jobs in one queue, narrowed to a state when given', async () => {
    const { db, jobQueue } = makeBossStub();
    db.$queryRaw.mockResolvedValue([{ value: 'e1' }, { value: 'e2' }]);

    const values = await jobQueue.findJobValues('probe', 'eventId', { limit: 5, state: 'retry' });

    const query = capturedQuery(db.$queryRaw);
    expect(query.sql).toContain('FROM pgboss.job');
    expect(query.sql).toContain('state::text =');
    expect(query.values).toEqual(['eventId', 'probe', 'eventId', 'retry', 5]);
    expect(values).toEqual(['e1', 'e2']);
  });

  it('caps the field values at the given limit, newest jobs first', async () => {
    const { db, jobQueue } = makeBossStub();

    await jobQueue.findJobValues('probe', 'eventId', { limit: 5 });

    const query = capturedQuery(db.$queryRaw);
    expect(query.sql).toMatch(/ORDER BY MAX\(created_on\) DESC\s+LIMIT \?/);
    expect(query.values.at(-1)).toBe(5);
  });

  it('lists the field values of every job in the queue when no state is given', async () => {
    const { db, jobQueue } = makeBossStub();

    await jobQueue.findJobValues('probe-dead', 'eventId', { limit: 5 });

    const query = capturedQuery(db.$queryRaw);
    expect(query.sql).not.toContain('state::text');
    expect(query.values).toEqual(['eventId', 'probe-dead', 'eventId', 5]);
  });

  it('publishes inside a transaction through the open transaction', async () => {
    const rows = [{ id: 'job-2' }];
    const tx = { $queryRawUnsafe: vi.fn().mockResolvedValue(rows) };
    const { boss, jobQueue } = makeBossStub();
    boss.publish.mockImplementation(async (_event: string, _data: object, options: { db: Db }) => {
      await options.db.executeSql('INSERT', ['subscriber-a']);
    });

    await makeTransactionManager(tx).run(async (ctx) =>
      jobQueue.publishTx(ctx, 'probe.happened', { eventId: 'e1' }),
    );

    expect(boss.publish).toHaveBeenCalledWith(
      'probe.happened',
      { eventId: 'e1' },
      { db: expect.any(Object) },
    );
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith('INSERT', 'subscriber-a');
  });

  it('rejects a transactional publish with a context that is not open', async () => {
    const { boss, jobQueue } = makeBossStub();
    let closedCtx: Parameters<typeof jobQueue.publishTx>[0] | undefined;
    await makeTransactionManager({}).run(async (ctx) => {
      closedCtx = ctx;
    });

    await expect(jobQueue.publishTx(closedCtx!, 'probe.happened', {})).rejects.toThrow(
      'Invalid transaction context',
    );
    expect(boss.publish).not.toHaveBeenCalled();
  });

  it('publishes outside a transaction through the boss own connection', async () => {
    const { boss, jobQueue } = makeBossStub();

    await jobQueue.publish('probe.happened', { recipientIds: ['u1'] });

    expect(boss.publish).toHaveBeenCalledWith('probe.happened', { recipientIds: ['u1'] });
  });
});
