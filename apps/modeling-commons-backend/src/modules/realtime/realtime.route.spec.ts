import http from 'node:http';
import type { AddressInfo } from 'node:net';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import realtimeConfig from '#src/config/realtime.ts';
import realtimeRoutes from '#src/modules/realtime/realtime.route.ts';
import errorHandlerPlugin from '#src/server/plugins/error-handler.ts';
import { makeRealtimeBroker, type RealtimeBroker } from '#src/shared/realtime/broker.ts';
import { formatEventFrame, formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import { buildUserTopic } from '#src/shared/realtime/topics.ts';
import { addIdFormat } from '#src/shared/utils/validator.util.ts';

type OpenStream = {
  response: http.IncomingMessage;
  received: () => string;
  ended: Promise<void>;
  destroy: () => void;
};

const userHeader = 'x-test-user';
const expiresInHeader = 'x-test-expires-in-ms';

async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await predicate())) {
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function openStream(port: number, headers: Record<string, string>): Promise<OpenStream> {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/api/v1/events', headers });
    request.on('error', reject);
    request.on('response', (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        text += chunk;
      });
      response.on('error', () => undefined);
      const ended = new Promise<void>((resolveEnd) => response.on('close', () => resolveEnd()));
      resolve({
        response,
        received: () => text,
        ended,
        destroy: () => request.destroy(),
      });
    });
  });
}

describe('realtime routes', () => {
  let app: FastifyInstance;
  let broker: RealtimeBroker;
  let port: number;
  const streams: Array<OpenStream> = [];

  async function open(userId: string, extraHeaders: Record<string, string> = {}) {
    const stream = await openStream(port, { [userHeader]: userId, ...extraHeaders });
    streams.push(stream);
    return stream;
  }

  beforeEach(async () => {
    broker = makeRealtimeBroker({
      maxStreamsPerUser: realtimeConfig.streams.maxPerUser,
      heartbeatIntervalMs: realtimeConfig.streams.heartbeatIntervalMs,
    });
    app = Fastify({ ajv: { customOptions: { keywords: ['example'] }, onCreate: addIdFormat } });
    app.decorate('diContainer', {
      cradle: { realtimeBroker: broker },
    } as unknown as FastifyInstance['diContainer']);
    await app.register(errorHandlerPlugin);
    app.decorateRequest('user', null);
    app.decorateRequest('authSession', null);
    app.addHook('onRequest', async (request) => {
      const userId = request.headers[userHeader];
      if (typeof userId !== 'string') return;
      const expiresInMs = Number(request.headers[expiresInHeader] ?? 60_000);
      request.user = { id: userId } as NonNullable<typeof request.user>;
      request.authSession = {
        id: `session-${userId}`,
        userId,
        expiresAt: new Date(Date.now() + expiresInMs),
      };
    });
    await app.register(realtimeRoutes, { prefix: '/api' });
    await app.listen({ port: 0, host: '127.0.0.1' });
    port = (app.server.address() as AddressInfo).port;
  });

  afterEach(async () => {
    vi.useRealTimers();
    for (const stream of streams.splice(0)) stream.destroy();
    await app.close();
  });

  it('answers 401 without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/events' });
    expect(response.statusCode).toBe(401);
  });

  it('opens an event stream with no-buffering headers, no connection header, and the opening frames', async () => {
    const stream = await open('u1');

    expect(stream.response.statusCode).toBe(200);
    expect(stream.response.headers['content-type']).toBe('text/event-stream');
    expect(stream.response.headers['cache-control']).toBe('no-cache, no-transform');
    expect(stream.response.headers['x-accel-buffering']).toBe('no');
    expect(stream.response.headers['connection']).toBeUndefined();
    await waitUntil(() => stream.received().length > 0);
    expect(stream.received()).toBe(`retry: ${realtimeConfig.streams.clientRetryMs}\n\n: open\n\n`);
  });

  it('delivers an event published to the caller topic', async () => {
    const stream = await open('u1');
    await waitUntil(() => stream.received().includes(': open'));

    broker.publish(buildUserTopic('u1'), realtimeConfig.events.notifications);

    await waitUntil(() =>
      stream.received().endsWith(formatEventFrame(realtimeConfig.events.notifications)),
    );
  });

  it('refuses the 17th stream of one user with 429 and frees a slot when one closes', async () => {
    const open16 = await Promise.all(
      Array.from({ length: realtimeConfig.streams.maxPerUser }, () => open('u1')),
    );
    expect(open16.map((stream) => stream.response.statusCode)).toEqual(open16.map(() => 200));

    const refused = await open('u1');
    expect(refused.response.statusCode).toBe(429);

    open16[0]?.destroy();
    await waitUntil(async () => (await open('u1')).response.statusCode === 200);
  });

  it('ends the stream when the session expires', async () => {
    const stream = await open('u1', { [expiresInHeader]: '50' });

    await stream.ended;
    expect(stream.received()).toContain(': open');
  });

  it('ends a stream at the lifetime cap, not before, with a closing retry hint', async () => {
    const { maxStreamLifetimeMs, closingRetryMs } = realtimeConfig.streams;
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    let ended = false;
    const response = app
      .inject({
        method: 'GET',
        url: '/api/v1/events',
        headers: { [userHeader]: 'u1', [expiresInHeader]: String(2 * maxStreamLifetimeMs) },
      })
      .then((result) => {
        ended = true;
        return result;
      });

    await vi.advanceTimersByTimeAsync(maxStreamLifetimeMs - 1);
    expect(ended).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(ended).toBe(true);
    const { statusCode, body } = await response;
    expect(statusCode).toBe(200);
    expect(body.endsWith(formatRetryFrame(closingRetryMs))).toBe(true);
  });

  it('lets fastify.close() return in under a second with a stream open', async () => {
    const stream = await open('u1');
    await waitUntil(() => stream.received().includes(': open'));

    const started = Date.now();
    await app.close();

    expect(Date.now() - started).toBeLessThan(1000);
    await stream.ended;
  });
});
