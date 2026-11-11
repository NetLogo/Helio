import { EventEmitter } from 'node:events';
import type { FastifyBaseLogger } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import realtimeConfig from '#src/config/realtime.ts';
import {
  computeReconnectDelayMs,
  startPgListener,
  type ListenerClient,
} from '#src/shared/realtime/pg-listener.ts';
import type { AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';

const topics: ReadonlyArray<AnyRealtimeTopic> = [
  {
    type: 'model',
    events: ['model_comment.created'],
    getTopic: (event) => ({ type: 'model', id: event.resourceId }),
    canSubscribe: async () => true,
  },
];
const resync = { event: 'resync' };
const delays = { baseDelayMs: 500, maxDelayMs: 30_000 };

class StubClient extends EventEmitter implements ListenerClient {
  queries: Array<string> = [];
  ended = false;
  readonly failConnect: boolean;
  constructor(failConnect: boolean) {
    super();
    this.failConnect = failConnect;
  }
  connect = async () => {
    if (this.failConnect) throw new Error('connection refused');
  };
  query = async (sql: string) => {
    this.queries.push(sql);
  };
  end = async () => {
    this.ended = true;
  };
}

const logger = { info: vi.fn(), warn: vi.fn() };

function setup(connectFailures: Array<boolean> = []) {
  const clients: Array<StubClient> = [];
  const broker = { publish: vi.fn(), broadcast: vi.fn() };
  const listener = startPgListener({
    createClient: () => {
      const client = new StubClient(connectFailures[clients.length] ?? false);
      clients.push(client);
      return client;
    },
    broker,
    topics,
    logger: logger as unknown as FastifyBaseLogger,
    random: () => 0.5,
  });
  return { clients, broker, listener };
}

function listenedChannels(client: StubClient): Array<string> {
  return client.queries.flatMap((sql) =>
    [...sql.matchAll(/LISTEN (\w+);/g)].map((m) => m[1] ?? ''),
  );
}

describe('computeReconnectDelayMs', () => {
  it('waits between half and all of the doubled base delay', () => {
    expect(computeReconnectDelayMs(0, () => 0, delays)).toBe(250);
    expect(computeReconnectDelayMs(0, () => 1, delays)).toBe(500);
    expect(computeReconnectDelayMs(3, () => 0, delays)).toBe(2000);
    expect(computeReconnectDelayMs(3, () => 1, delays)).toBe(4000);
  });

  it('never waits longer than the maximum delay', () => {
    expect(computeReconnectDelayMs(20, () => 1, delays)).toBe(30_000);
    expect(computeReconnectDelayMs(20, () => 0, delays)).toBe(15_000);
  });
});

describe('startPgListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('listens on the one configured channel and publishes each parsed message', async () => {
    const { clients, broker } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const [client] = clients;
    const message = { topic: { type: 'model', id: 'm1' }, event: 'model_comment.created' };

    expect(listenedChannels(client!)).toEqual([realtimeConfig.channel]);

    client!.emit('notification', {
      channel: realtimeConfig.channel,
      payload: JSON.stringify(message),
    });

    expect(broker.publish.mock.calls).toEqual([[message]]);
    expect(broker.broadcast).not.toHaveBeenCalled();
  });

  it.each([
    ['is not JSON', '{"topic":'],
    ['names an unregistered topic type', '{"topic":{"type":"user","id":"u1"},"event":"x"}'],
  ])('logs and drops a payload that %s, then keeps publishing', async (_, payload) => {
    const { clients, broker } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const [client] = clients;
    const message = { topic: { type: 'model', id: 'm1' }, event: 'model_comment.created' };

    client!.emit('notification', { channel: realtimeConfig.channel, payload });
    client!.emit('notification', {
      channel: realtimeConfig.channel,
      payload: JSON.stringify(message),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ payload }),
      expect.any(String),
    );
    expect(broker.publish.mock.calls).toEqual([[message]]);
    expect(clients).toHaveLength(1);
  });

  it('reconnects after a lost connection, listens again, then broadcasts one resync', async () => {
    const { clients, broker } = setup();
    await vi.advanceTimersByTimeAsync(0);

    clients[0]!.emit('error', new Error('terminating connection due to administrator command'));
    clients[0]!.emit('end');
    expect(clients[0]!.ended).toBe(true);
    expect(clients).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(computeReconnectDelayMs(0, () => 0.5, delays));

    expect(clients).toHaveLength(2);
    expect(listenedChannels(clients[1]!)).toEqual([realtimeConfig.channel]);
    expect(broker.broadcast.mock.calls).toEqual([[resync]]);
  });

  it('keeps retrying with a growing delay while the database refuses connections', async () => {
    const { clients, broker } = setup([false, true, false]);
    await vi.advanceTimersByTimeAsync(0);
    clients[0]!.emit('end');

    await vi.advanceTimersByTimeAsync(computeReconnectDelayMs(0, () => 0.5, delays));
    expect(clients).toHaveLength(2);
    expect(broker.broadcast).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(computeReconnectDelayMs(1, () => 0.5, delays) - 1);
    expect(clients).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);

    expect(clients).toHaveLength(3);
    expect(broker.broadcast.mock.calls).toEqual([[resync]]);
  });

  it('ends the connection on stop and never reconnects', async () => {
    const { clients, listener } = setup();
    await vi.advanceTimersByTimeAsync(0);

    await listener.stop();
    clients[0]!.emit('end');
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(delays.maxDelayMs);

    expect(clients[0]!.ended).toBe(true);
    expect(clients).toHaveLength(1);
  });

  it('cancels a pending reconnect on stop', async () => {
    const { clients, listener } = setup();
    await vi.advanceTimersByTimeAsync(0);
    clients[0]!.emit('end');

    await listener.stop();
    await vi.advanceTimersByTimeAsync(delays.maxDelayMs);

    expect(clients).toHaveLength(1);
  });
});
