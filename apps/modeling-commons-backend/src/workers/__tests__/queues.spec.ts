import { describe, it, expect, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import workersConfig, { subscriberQueues, workerQueues } from '#src/config/workers.ts';
import {
  getDeadLetterQueueName,
  registerQueues,
  upsertQueueWithDeadLetter,
} from '#src/workers/queues.ts';

function makeBoss() {
  const stub = {
    createQueue: vi.fn().mockResolvedValue(undefined),
    updateQueue: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };
  return { boss: stub as unknown as PgBoss, stub };
}

const queueConfig = workersConfig.userNotifications;
const queueOptions = {
  ...queueConfig.options,
  deadLetter: getDeadLetterQueueName(queueConfig.queueName),
};

describe('upsertQueueWithDeadLetter', () => {
  it('creates the dead-letter queue before the queue that points at it', async () => {
    const { boss, stub } = makeBoss();

    await upsertQueueWithDeadLetter(boss, queueConfig);

    expect(stub.createQueue.mock.calls).toEqual([
      ['user-notifications-dead', workersConfig.deadLetter],
      ['user-notifications', queueOptions],
    ]);
  });

  it('updates both queues so config edits reach queues that already exist', async () => {
    const { boss, stub } = makeBoss();

    await upsertQueueWithDeadLetter(boss, queueConfig);

    expect(stub.updateQueue).toHaveBeenCalledWith(
      'user-notifications-dead',
      workersConfig.deadLetter,
    );
    expect(stub.updateQueue).toHaveBeenCalledWith('user-notifications', queueOptions);
  });
});

describe('registerQueues', () => {
  it('creates every queue in the workers config with its dead letter', async () => {
    const { boss, stub } = makeBoss();
    const {
      schema: _schema,
      apiPoolSize: _apiPoolSize,
      deadLetter: _deadLetter,
      ...configuredQueues
    } = workersConfig;

    await registerQueues(boss);

    for (const { queueName, options } of Object.values(configuredQueues)) {
      expect(stub.createQueue).toHaveBeenCalledWith(queueName, {
        ...options,
        deadLetter: getDeadLetterQueueName(queueName),
      });
    }
    expect(workerQueues.length + subscriberQueues.length).toBe(
      Object.keys(configuredQueues).length,
    );
  });

  it('creates each subscriber queue and its dead letter before subscribing it', async () => {
    const { boss, stub } = makeBoss();
    const order: Array<string> = [];
    stub.createQueue.mockImplementation(async (name: string) => order.push(`create ${name}`));
    stub.subscribe.mockImplementation(async (event: string, name: string) =>
      order.push(`subscribe ${name} ${event}`),
    );

    await registerQueues(boss);

    for (const { queueName, subscribesTo } of subscriberQueues) {
      const created = order.indexOf(`create ${queueName}`);
      expect(order.indexOf(`create ${getDeadLetterQueueName(queueName)}`)).toBeLessThan(created);
      for (const eventType of subscribesTo) {
        expect(order.indexOf(`subscribe ${queueName} ${eventType}`)).toBeGreaterThan(created);
      }
    }
  });

  it('subscribes every configured queue to exactly the event types it lists', async () => {
    const { boss, stub } = makeBoss();

    await registerQueues(boss);

    const expected = subscriberQueues.flatMap(({ queueName, subscribesTo }) =>
      subscribesTo.map((eventType) => [eventType, queueName]),
    );
    expect(stub.subscribe.mock.calls).toEqual(expected);
    expect(stub.subscribe).toHaveBeenCalledWith('model_comment.created', 'user-notifications');
    expect(stub.subscribe).not.toHaveBeenCalledWith('model_comment.created', 'realtime');
  });
});

