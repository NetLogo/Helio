import http from 'node:http';
import type { AddressInfo } from 'node:net';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import realtimeConfig from '#src/config/realtime.ts';
import realtimeRoutes from '#src/modules/realtime/realtime.route.ts';
import errorHandlerPlugin from '#src/server/plugins/error-handler.ts';
import { NotFoundException } from '#src/shared/exceptions/index.ts';
import { makeRealtimeBroker, type RealtimeBroker } from '#src/shared/realtime/broker.ts';
import type { AnyRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';
import { formatMessageFrame, formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import { addIdFormat } from '#src/shared/utils/validator.util.ts';

type OpenStream = {
  response: http.IncomingMessage;
  received: () => string;
  ended: Promise<void>;
  destroy: () => void;
};

const userHeader = 'x-test-user';
const expiresInHeader = 'x-test-expires-in-ms';
const readableModel = 'readableModel00000001';
const missingModel = 'missingModel000000001';
const otherModels = Array.from(
  { length: 20 },
  (_, index) => `otherModel${String(index).padStart(11, '0')}`,
);
const commentOn = (id: string) =>
  ({ topic: { type: 'model', id }, event: 'model_comment.created' }) as const;

const fakeModelTopic: AnyRealtimeTopic = {
  type: 'model',
  events: ['model_comment.created'],
  getTopic: (event) => ({ type: 'model', id: event.resourceId }),
  canSubscribe: async (_deps, _viewerId, id) => {
    if (id === missingModel) throw new NotFoundException('Model not found');
    return id !== 'hiddenModel0000000001';
  },
};

function getConnectionId(text: string): string | undefined {
  const match = /data: (\{"event":"connection"[^\n]*)\n/.exec(text);
  return match?.[1] ? (JSON.parse(match[1]) as { connectionId: string }).connectionId : undefined;
}

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
      maxTopicsPerStream: realtimeConfig.streams.maxTopicsPerStream,
      heartbeatIntervalMs: realtimeConfig.streams.heartbeatIntervalMs,
    });
    app = Fastify({ ajv: { customOptions: { keywords: ['example'] }, onCreate: addIdFormat } });
    app.decorate('diContainer', {
      cradle: { realtimeBroker: broker, realtimeTopics: [fakeModelTopic] },
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
    expect(stream.received()).toMatch(
      new RegExp(
        `^retry: ${realtimeConfig.streams.clientRetryMs}\\n\\n: open\\n\\ndata: \\{"event":"connection","connectionId":"[A-Za-z0-9_-]{21}"\\}\\n\\n$`,
      ),
    );
  });

  it('sends each stream its own connection id', async () => {
    const first = await open('u1');
    const second = await open('u1');
    await waitUntil(() =>
      Boolean(getConnectionId(first.received()) && getConnectionId(second.received())),
    );

    expect(getConnectionId(first.received())).not.toBe(getConnectionId(second.received()));
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
  describe('subscriptions', () => {
    async function openWithConnection(userId: string) {
      const stream = await open(userId);
      await waitUntil(() => getConnectionId(stream.received()) !== undefined);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return { stream, connectionId: getConnectionId(stream.received())! };
    }

    function send(
      method: 'POST' | 'DELETE',
      userId: string | null,
      payload: Record<string, unknown>,
    ) {
      return app.inject({
        method,
        url: '/api/v1/events/subscriptions',
        headers: userId ? { [userHeader]: userId } : {},
        payload,
      });
    }

    const modelTopic = (id: string) => ({ type: 'model', id });

    async function expectFrames(stream: OpenStream, id: string, count: number) {
      await waitUntil(() => stream.received().includes(': open'));
      const frame = formatMessageFrame(commentOn(id));
      expect(stream.received().split(frame).length - 1).toBe(count);
    }

    it.each(['POST', 'DELETE'] as const)(
      'answers %s with 401 without a session',
      async (method) => {
        const response = await send(method, null, {
          connectionId: 'connection00000000001',
          topic: modelTopic(readableModel),
        });
        expect(response.statusCode).toBe(401);
      },
    );

    it.each(['POST', 'DELETE'] as const)(
      'answers %s with 400 on a body that fails the schema',
      async (method) => {
        const response = await send(method, 'u1', { topic: modelTopic(readableModel) });
        expect(response.statusCode).toBe(400);
      },
    );

    it.each(['POST', 'DELETE'] as const)(
      'answers %s with 400 on a topic type no module registers',
      async (method) => {
        const { connectionId } = await openWithConnection('u1');
        const response = await send(method, 'u1', {
          connectionId,
          topic: { type: 'project', id: readableModel },
        });
        expect(response.statusCode).toBe(400);
      },
    );

    it('opens a stream holding no topic, not even the caller user topic', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      const ownNotification = {
        topic: { type: 'user', id: 'u1' },
        event: 'user_notification.created',
      } as const;
      broker.publish(ownNotification);

      await send('POST', 'u1', { connectionId, topic: modelTopic(readableModel) });
      broker.publish(commentOn(readableModel));

      await waitUntil(() =>
        stream.received().endsWith(formatMessageFrame(commentOn(readableModel))),
      );
      expect(stream.received()).not.toContain(formatMessageFrame(ownNotification));
    });

    it('delivers a topic event only after the topic is subscribed', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      broker.publish(commentOn(readableModel));

      const response = await send('POST', 'u1', { connectionId, topic: modelTopic(readableModel) });
      broker.publish(commentOn(readableModel));

      expect(response.statusCode).toBe(204);
      await waitUntil(() =>
        stream.received().endsWith(formatMessageFrame(commentOn(readableModel))),
      );
      await expectFrames(stream, readableModel, 1);
    });

    it('answers 403 and adds nothing when the topic refuses the viewer', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      const hidden = 'hiddenModel0000000001';

      const response = await send('POST', 'u1', { connectionId, topic: modelTopic(hidden) });
      broker.publish(commentOn(hidden));

      expect(response.statusCode).toBe(403);
      await expectFrames(stream, hidden, 0);
    });

    it('answers 404 when the topic reports its resource missing', async () => {
      const { connectionId } = await openWithConnection('u1');
      const response = await send('POST', 'u1', { connectionId, topic: modelTopic(missingModel) });
      expect(response.statusCode).toBe(404);
    });

    it('answers 404 and adds nothing for an unknown connection id or one of another user', async () => {
      const { stream, connectionId } = await openWithConnection('u1');

      const foreign = await send('POST', 'u2', { connectionId, topic: modelTopic(readableModel) });
      const unknown = await send('POST', 'u1', {
        connectionId: 'connection00000000001',
        topic: modelTopic(readableModel),
      });
      broker.publish(commentOn(readableModel));

      expect([foreign.statusCode, unknown.statusCode]).toEqual([404, 404]);
      await expectFrames(stream, readableModel, 0);
    });

    it('keeps one subscription when a topic is subscribed twice', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      const body = { connectionId, topic: modelTopic(readableModel) };

      await send('POST', 'u1', body);
      await send('POST', 'u1', body);
      broker.publish(commentOn(readableModel));

      await waitUntil(() =>
        stream.received().endsWith(formatMessageFrame(commentOn(readableModel))),
      );
      await expectFrames(stream, readableModel, 1);
    });

    it('answers 404 to the 17th distinct topic on one stream and does not add it', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      const { maxTopicsPerStream } = realtimeConfig.streams;
      const accepted = otherModels.slice(0, maxTopicsPerStream);

      const answers = [];
      for (const id of accepted) {
        answers.push(
          (await send('POST', 'u1', { connectionId, topic: modelTopic(id) })).statusCode,
        );
      }
      const extra = otherModels[maxTopicsPerStream] ?? '';
      const refused = await send('POST', 'u1', { connectionId, topic: modelTopic(extra) });
      broker.publish(commentOn(extra));

      expect(answers).toEqual(accepted.map(() => 204));
      expect(refused.statusCode).toBe(404);
      await expectFrames(stream, extra, 0);
    });

    it('stops one topic on DELETE and keeps delivering the others', async () => {
      const { stream, connectionId } = await openWithConnection('u1');
      const [kept = '', dropped = ''] = otherModels;
      await send('POST', 'u1', { connectionId, topic: modelTopic(kept) });
      await send('POST', 'u1', { connectionId, topic: modelTopic(dropped) });

      const response = await send('DELETE', 'u1', { connectionId, topic: modelTopic(dropped) });
      broker.publish(commentOn(dropped));
      broker.publish(commentOn(kept));

      expect(response.statusCode).toBe(204);
      await waitUntil(() => stream.received().endsWith(formatMessageFrame(commentOn(kept))));
      await expectFrames(stream, dropped, 0);
    });

    it('forgets the connection id once the stream closes', async () => {
      const { stream, connectionId } = await openWithConnection('u1');

      stream.destroy();
      await waitUntil(
        async () =>
          (await send('POST', 'u1', { connectionId, topic: modelTopic(readableModel) }))
            .statusCode === 404,
      );
    });
  });
});
