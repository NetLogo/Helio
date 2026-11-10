import realtimeConfig from '#src/config/realtime.ts';
import type { RealtimeBroker } from '#src/shared/realtime/broker.ts';
import { resolveChannelSignal } from '#src/shared/realtime/topics.ts';
import type { FastifyBaseLogger } from 'fastify';

export type ListenerNotification = { channel: string; payload?: string };

export type ListenerClient = {
  connect: () => Promise<unknown>;
  query: (sql: string) => Promise<unknown>;
  end: () => Promise<unknown>;
  on: {
    (event: 'notification', handler: (notification: ListenerNotification) => void): unknown;
    (event: 'error', handler: (error: Error) => void): unknown;
    (event: 'end', handler: () => void): unknown;
  };
};

export type PgListener = { stop: () => Promise<void> };

const listenSql = Object.values(realtimeConfig.channels)
  .map((channel) => `LISTEN ${channel};`)
  .join(' ');

export function computeReconnectDelayMs(
  attempt: number,
  random: () => number,
  { baseDelayMs, maxDelayMs }: { baseDelayMs: number; maxDelayMs: number },
): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}

async function listen(client: ListenerClient): Promise<void> {
  await client.connect();
  await client.query(listenSql);
}

export function startPgListener({
  createClient,
  broker,
  logger,
  random,
}: {
  createClient: () => ListenerClient;
  broker: Pick<RealtimeBroker, 'publish' | 'broadcast'>;
  logger: FastifyBaseLogger;
  random: () => number;
}): PgListener {
  const delays = {
    baseDelayMs: realtimeConfig.listener.reconnectBaseDelayMs,
    maxDelayMs: realtimeConfig.listener.reconnectMaxDelayMs,
  };
  let stopped = false;
  let current: ListenerClient | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  function connect(attempt: number, isReconnect: boolean): void {
    if (stopped) return;
    const client = createClient();
    current = client;
    let lost = false;

    function handleLoss(reason: unknown): void {
      if (lost || stopped) return;
      lost = true;
      logger.warn({ name: 'realtime', reason, attempt }, 'Realtime listener connection lost');
      if (current === client) current = null;
      void client.end().catch(() => undefined);
      const delay = computeReconnectDelayMs(attempt, random, delays);
      retry = setTimeout(() => {
        retry = null;
        connect(attempt + 1, true);
      }, delay);
      retry.unref();
    }

    client.on('notification', ({ channel, payload }) => {
      const signal = resolveChannelSignal(channel, payload);
      if (signal) broker.publish(signal.topic, signal.event);
    });
    client.on('error', handleLoss);
    client.on('end', () => {
      handleLoss('end');
    });

    listen(client)
      .then(() => {
        if (lost || stopped) return;
        attempt = 0;
        logger.info({ name: 'realtime' }, 'Realtime listener is listening');
        if (isReconnect) broker.broadcast(realtimeConfig.events.resync);
      })
      .catch(handleLoss);
  }

  connect(0, false);

  return {
    async stop() {
      stopped = true;
      if (retry) clearTimeout(retry);
      await current?.end().catch(() => undefined);
    },
  };
}
