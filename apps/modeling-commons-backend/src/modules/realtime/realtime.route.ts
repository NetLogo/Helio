import { PassThrough } from 'node:stream';
import realtimeConfig from '#src/config/realtime.ts';
import {
  streamSubscriptionRequestDtoSchema,
  type StreamSubscriptionRequestDto,
} from '#src/modules/realtime/dtos/stream-subscription.request.dto.ts';
import {
  ArgumentInvalidException,
  ForbiddenException,
  NotFoundException,
  TooManyRequestsException,
} from '#src/shared/exceptions/index.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { findRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';
import { computeStreamLifetimeMs } from '#src/shared/realtime/stream-lifetime.ts';
import {
  formatCommentFrame,
  formatMessageFrame,
  formatRetryFrame,
} from '#src/shared/realtime/sse-frame.ts';
import { newId } from '#src/shared/utils/id.ts';
import { buildTopicKey } from '@repo/modeling-commons-shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const openingFrames =
  formatRetryFrame(realtimeConfig.streams.clientRetryMs) + formatCommentFrame('open');

function writeFrame(stream: PassThrough, frame: string): boolean {
  if (stream.destroyed || stream.writableEnded) return false;
  stream.write(frame);
  return true;
}

function endStream(stream: PassThrough) {
  writeFrame(stream, formatRetryFrame(realtimeConfig.streams.closingRetryMs));
  stream.end();
}

export default async function realtimeRoutes(fastify: FastifyInstance) {
  const { realtimeBroker, realtimeTopics } = fastify.diContainer.cradle;

  fastify.addHook('preClose', async () => {
    realtimeBroker.endAll();
  });

  function openStream(request: FastifyRequest, reply: FastifyReply) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: userId } = request.user!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { expiresAt } = request.authSession!;
    const connectionId = newId();
    const stream = new PassThrough();
    const closeStream = realtimeBroker.openStream({
      connectionId,
      userId,
      write: (frame) => writeFrame(stream, frame),
      end: () => stream.end(),
    });
    if (!closeStream) {
      throw new TooManyRequestsException('Too many open event streams');
    }

    const lifetimeMs = computeStreamLifetimeMs(
      expiresAt,
      Date.now(),
      realtimeConfig.streams.maxStreamLifetimeMs,
    );
    const expiry = setTimeout(endStream, lifetimeMs, stream);
    const close = () => {
      clearTimeout(expiry);
      closeStream();
    };
    stream.once('close', close);
    stream.on('error', close);

    stream.write(openingFrames + formatMessageFrame({ event: 'connection', connectionId }));
    reply.raw.removeHeader('connection');
    return reply
      .header('content-type', 'text/event-stream')
      .header('cache-control', 'no-cache, no-transform')
      .header('x-accel-buffering', 'no')
      .send(stream);
  }

  function readSubscription(request: FastifyRequest<{ Body: StreamSubscriptionRequestDto }>) {
    const { connectionId, topic } = request.body;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: userId } = request.user!;
    const registered = findRealtimeTopic(realtimeTopics, topic.type);
    if (!registered) throw new ArgumentInvalidException(`Unknown topic type "${topic.type}"`);
    const key = buildTopicKey({ type: registered.type, id: topic.id });
    return { connectionId, userId, topicId: topic.id, registered, key };
  }

  fastify.get(
    '/v1/events',
    {
      schema: { tags: ['Realtime'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => openStream(request, reply),
  );

  fastify.post<{ Body: StreamSubscriptionRequestDto }>(
    '/v1/events/subscriptions',
    {
      schema: { body: streamSubscriptionRequestDtoSchema, tags: ['Realtime'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { connectionId, userId, topicId, registered, key } = readSubscription(request);
      if (!(await registered.canSubscribe(fastify.diContainer.cradle, userId, topicId))) {
        throw new ForbiddenException('You cannot subscribe to this topic');
      }
      if (!realtimeBroker.addTopic({ connectionId, userId, topic: key })) {
        throw new NotFoundException('Unknown or full event stream');
      }
      return reply.status(204).send();
    },
  );

  fastify.delete<{ Body: StreamSubscriptionRequestDto }>(
    '/v1/events/subscriptions',
    {
      schema: { body: streamSubscriptionRequestDtoSchema, tags: ['Realtime'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { connectionId, userId, key } = readSubscription(request);
      realtimeBroker.removeTopic({ connectionId, userId, topic: key });
      return reply.status(204).send();
    },
  );
}
