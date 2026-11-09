import { describe, it, expect, vi } from 'vitest';
import type { Db, PgBoss } from 'pg-boss';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import makePrismaTransactionManager from '#src/shared/db/prisma-transaction.manager.ts';
import makePgBossJobQueue from '#src/shared/jobs/pg-boss.job-queue.ts';

function makeBossStub() {
  const executeSql = vi.fn().mockResolvedValue({ rows: [] });
  const boss = {
    send: vi.fn().mockResolvedValue('job-1'),
    getDb: vi.fn().mockReturnValue({ executeSql }),
  };
  const logger = { debug: vi.fn() };
  const jobQueue = makePgBossJobQueue({ boss: boss as unknown as PgBoss, logger });
  return { boss, executeSql, logger, jobQueue };
}

function makeSubscribedTx(queueNames: Array<string>) {
  return {
    $queryRawUnsafe: vi.fn(async (sql: string) =>
      sql.includes('.subscription') ? queueNames.map((name) => ({ name })) : [],
    ),
  };
}

function makeTransactionManager(tx: object) {
  const db = {
    $transaction: async (fn: (client: object) => Promise<unknown>) => fn(tx),
  } as unknown as ExtendedPrismaClient;
  return makePrismaTransactionManager({ db });
}

describe('pgBossJobQueue', () => {
  it('sends outside a transaction through the boss own connection', async () => {
    const { boss, jobQueue } = makeBossStub();

    const id = await jobQueue.send('probe', { a: 1 }, { retryLimit: 2 });

    expect(id).toBe('job-1');
    expect(boss.send).toHaveBeenCalledWith('probe', { a: 1 }, { retryLimit: 2 });
  });

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
    const { executeSql, jobQueue } = makeBossStub();
    executeSql.mockResolvedValue({ rows });

    const result = await jobQueue.findJobStates(['probe', 'probe-graveyard'], 'eventId', [
      'e1',
      'e2',
    ]);

    expect(executeSql).toHaveBeenCalledWith(expect.stringContaining('FROM pgboss.job'), [
      'eventId',
      ['probe', 'probe-graveyard'],
      ['e1', 'e2'],
    ]);
    expect(result).toEqual(rows);
  });

  it('lists the field values of jobs in one queue, narrowed to a state when given', async () => {
    const { executeSql, jobQueue } = makeBossStub();
    executeSql.mockResolvedValue({ rows: [{ value: 'e1' }, { value: 'e2' }] });

    const values = await jobQueue.findJobValues('probe', 'eventId', 'retry');

    expect(executeSql).toHaveBeenCalledWith(expect.stringContaining('FROM pgboss.job'), [
      'eventId',
      'probe',
      'retry',
    ]);
    expect(values).toEqual(['e1', 'e2']);
  });

  it('lists the field values of every job in the queue when no state is given', async () => {
    const { executeSql, jobQueue } = makeBossStub();

    await jobQueue.findJobValues('probe-dead', 'eventId');

    expect(executeSql.mock.calls[0]![1]).toEqual(['eventId', 'probe-dead', null]);
  });

  it('publishes inside a transaction to every subscribed queue through the open transaction', async () => {
    const tx = makeSubscribedTx(['subscriber-a', 'subscriber-b']);
    const { boss, executeSql, jobQueue } = makeBossStub();
    boss.send.mockImplementation(async (queue: string, _data: object, options: { db: Db }) => {
      await options.db.executeSql('INSERT', [queue]);
      return `job-${queue}`;
    });

    const ids = await makeTransactionManager(tx).run(async (ctx) =>
      jobQueue.publishTx(ctx, 'probe.happened', { eventId: 'e1' }),
    );

    expect(ids).toEqual(['job-subscriber-a', 'job-subscriber-b']);
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('FROM pgboss.subscription WHERE event = $1'),
      'probe.happened',
    );
    expect(boss.send.mock.calls.map(([queue, data]) => [queue, data])).toEqual([
      ['subscriber-a', { eventId: 'e1' }],
      ['subscriber-b', { eventId: 'e1' }],
    ]);
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith('INSERT', 'subscriber-a');
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith('INSERT', 'subscriber-b');
    expect(executeSql).not.toHaveBeenCalled();
  });

  it('fails a transactional publish when a subscribed queue returns no job id', async () => {
    const tx = makeSubscribedTx(['subscriber-a', 'subscriber-b']);
    const { boss, jobQueue } = makeBossStub();
    boss.send.mockResolvedValueOnce('job-a').mockResolvedValueOnce(null);

    await expect(
      makeTransactionManager(tx).run(async (ctx) =>
        jobQueue.publishTx(ctx, 'probe.happened', { eventId: 'e1' }),
      ),
    ).rejects.toThrow('No subscriber-b job was created for a probe.happened publish');
  });

  it('fails a transactional publish when a send rejects', async () => {
    const tx = makeSubscribedTx(['subscriber-a']);
    const { boss, jobQueue } = makeBossStub();
    const error = new Error('insert failed');
    boss.send.mockRejectedValue(error);

    await expect(
      makeTransactionManager(tx).run(async (ctx) =>
        jobQueue.publishTx(ctx, 'probe.happened', { eventId: 'e1' }),
      ),
    ).rejects.toBe(error);
  });

  it('resolves a publish with no subscriber without sending, logging it at debug', async () => {
    const tx = makeSubscribedTx([]);
    const { boss, logger, jobQueue } = makeBossStub();

    const ids = await makeTransactionManager(tx).run(async (ctx) =>
      jobQueue.publishTx(ctx, 'nobody.listens', { eventId: 'e1' }),
    );

    expect(ids).toEqual([]);
    expect(boss.send).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith({ event: 'nobody.listens' }, expect.any(String));
  });

  it('publishes outside a transaction through the boss own connection', async () => {
    const { boss, executeSql, jobQueue } = makeBossStub();
    executeSql.mockResolvedValue({ rows: [{ name: 'subscriber-a' }] });

    const ids = await jobQueue.publish('probe.happened', { recipientIds: ['u1'] });

    expect(ids).toEqual(['job-1']);
    expect(executeSql).toHaveBeenCalledWith(expect.stringContaining('pgboss.subscription'), [
      'probe.happened',
    ]);
    expect(boss.send).toHaveBeenCalledWith(
      'subscriber-a',
      { recipientIds: ['u1'] },
      { db: boss.getDb() },
    );
  });

  it('fails a plain publish when a subscribed queue returns no job id', async () => {
    const { boss, executeSql, jobQueue } = makeBossStub();
    executeSql.mockResolvedValue({ rows: [{ name: 'subscriber-a' }] });
    boss.send.mockResolvedValue(null);

    await expect(jobQueue.publish('probe.happened', {})).rejects.toThrow(
      'No subscriber-a job was created for a probe.happened publish',
    );
  });
});
