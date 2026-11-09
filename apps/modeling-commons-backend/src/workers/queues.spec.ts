import { describe, it, expect, vi } from 'vitest';
import type { PgBoss } from 'pg-boss';
import workersConfig from '#src/config/workers.ts';
import {
  getDeadLetterQueueName,
  listSubscriberEntries,
  registerQueue,
  registerSendQueues,
  registerSubscriptions,
  retireQueues,
} from '#src/workers/queues.ts';

function makeBoss() {
  const stub = {
    createQueue: vi.fn().mockResolvedValue(undefined),
    updateQueue: vi.fn().mockResolvedValue(undefined),
    unschedule: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };
  return { boss: stub as unknown as PgBoss, stub };
}

const entry = workersConfig.userNotifications;
const queueOptions = { ...entry.queue, deadLetter: getDeadLetterQueueName(entry.queueName) };

describe('registerQueue', () => {
  it('creates the dead-letter queue before the queue that points at it', async () => {
    const { boss, stub } = makeBoss();

    await registerQueue(boss, entry);

    expect(stub.createQueue.mock.calls).toEqual([
      ['user-notifications-dead', workersConfig.deadLetter],
      ['user-notifications', queueOptions],
    ]);
  });

  it('updates both queues so config edits reach queues that already exist', async () => {
    const { boss, stub } = makeBoss();

    await registerQueue(boss, entry);

    expect(stub.updateQueue).toHaveBeenCalledWith(
      'user-notifications-dead',
      workersConfig.deadLetter,
    );
    expect(stub.updateQueue).toHaveBeenCalledWith('user-notifications', queueOptions);
  });
});

describe('registerSendQueues', () => {
  it('creates every queue the api sends to, each after its dead-letter queue', async () => {
    const { boss, stub } = makeBoss();

    await registerSendQueues(boss);

    expect(stub.createQueue.mock.calls.map(([name]) => name)).toEqual([
      'send-email-dead',
      'send-email',
    ]);
    expect(stub.createQueue).toHaveBeenCalledWith('send-email', {
      ...workersConfig.sendEmail.queue,
      deadLetter: 'send-email-dead',
    });
  });
});

describe('listSubscriberEntries', () => {
  it('lists every config entry that subscribes to events and nothing else', () => {
    const config = {
      schema: 'pgboss',
      retiredQueueNames: ['old'],
      plain: { queueName: 'plain', queue: {} },
      first: { queueName: 'first', queue: {}, subscribesTo: ['a.created'] },
      second: { queueName: 'second', queue: {}, subscribesTo: ['a.created', 'b.created'] },
    };

    expect(listSubscriberEntries(config).map((subscriber) => subscriber.queueName)).toEqual([
      'first',
      'second',
    ]);
  });

  it('finds the user-notifications and realtime subscribers in the workers config', () => {
    expect(listSubscriberEntries().map((subscriber) => subscriber.queueName)).toEqual([
      'user-notifications',
      'realtime',
    ]);
  });
});

describe('registerSubscriptions', () => {
  it('creates each subscriber queue and its dead letter before subscribing it', async () => {
    const { boss, stub } = makeBoss();
    const order: Array<string> = [];
    stub.createQueue.mockImplementation(async (name: string) => order.push(`create ${name}`));
    stub.subscribe.mockImplementation(async (event: string, name: string) =>
      order.push(`subscribe ${name} ${event}`),
    );

    await registerSubscriptions(boss);

    for (const { queueName, subscribesTo } of listSubscriberEntries()) {
      const created = order.indexOf(`create ${queueName}`);
      expect(order.indexOf(`create ${getDeadLetterQueueName(queueName)}`)).toBeLessThan(created);
      for (const eventType of subscribesTo) {
        expect(order.indexOf(`subscribe ${queueName} ${eventType}`)).toBeGreaterThan(created);
      }
    }
  });

  it('subscribes every configured queue to exactly the event types it lists', async () => {
    const { boss, stub } = makeBoss();

    await registerSubscriptions(boss);

    const expected = listSubscriberEntries().flatMap(({ queueName, subscribesTo }) =>
      subscribesTo.map((eventType) => [eventType, queueName]),
    );
    expect(stub.subscribe.mock.calls).toEqual(expected);
    expect(stub.subscribe).toHaveBeenCalledWith('model_comment.created', 'user-notifications');
    expect(stub.subscribe).toHaveBeenCalledWith('model_comment.created', 'realtime');
    expect(stub.subscribe).toHaveBeenCalledWith('user_notification.created', 'realtime');
  });
});

describe('retireQueues', () => {
  it('drops the schedule of every retired queue', async () => {
    const { boss, stub } = makeBoss();

    await retireQueues(boss, ['old-a', 'old-b']);

    expect(stub.unschedule).toHaveBeenCalledWith('old-a');
    expect(stub.unschedule).toHaveBeenCalledWith('old-b');
  });
});
