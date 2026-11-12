import { PassThrough } from 'node:stream';
import realtimeConfig from '#src/config/realtime.ts';
import {
  streamTopicsQueryDtoSchema,
  type StreamTopicsQueryDto,
} from '#src/modules/realtime/dtos/stream-topics.query.dto.ts';
import {
  ArgumentInvalidException,
  ForbiddenException,
  TooManyRequestsException,
} from '#src/shared/exceptions/index.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { findRealtimeTopic } from '#src/shared/realtime/realtime-topic.ts';
import { formatCommentFrame, formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function realtimeRoutes(fastify: FastifyInstance) {
  const { realtimeBroker, realtimeTopics } = fastify.diContainer.cradle;
  const openingFrames =
    formatRetryFrame(realtimeConfig.streams.clientRetryMs) + formatCommentFrame('open');

  fastify.addHook('preClose', async () => {
    realtimeBroker.endAll();
  });

  function writeFrame(stream: PassThrough, frame: string): boolean {
    if (stream.destroyed || stream.writableEnded) return false;
    stream.write(frame);
    return true;
  }

  function endStream(stream: PassThrough) {
    writeFrame(stream, formatRetryFrame(realtimeConfig.streams.closingRetryMs));
    stream.end();
  }

  async function authorizeTopics(userId: string, query: string): Promise<Set<string>> {
    const keys = new Set(query.split(','));
    if (keys.size > realtimeConfig.streams.maxTopicsPerStream) {
      throw new ArgumentInvalidException(
        `A stream follows at most ${realtimeConfig.streams.maxTopicsPerStream} topics`,
      );
    }
    for (const key of keys) {
      const [type, id = ''] = key.split(':');
      const registered = findRealtimeTopic(realtimeTopics, type);
      if (!registered) throw new ArgumentInvalidException(`Unknown topic type "${type}"`);
      if (!(await registered.canSubscribe(fastify.diContainer.cradle, userId, id))) {
        throw new ForbiddenException('You cannot subscribe to this topic');
      }
    }
    return keys;
  }

  async function openStream(
    request: FastifyRequest<{ Querystring: StreamTopicsQueryDto }>,
    reply: FastifyReply,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: userId } = request.user!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { expiresAt } = request.authSession!;
    const topics = await authorizeTopics(userId, request.query.topics);
    const stream = new PassThrough();
    const closeStream = realtimeBroker.openStream({
      userId,
      topics,
      write: (frame) => writeFrame(stream, frame),
      end: () => stream.end(),
    });
    if (!closeStream) {
      throw new TooManyRequestsException('Too many open event streams');
    }

    const lifetimeMs = Math.min(
      Math.max(expiresAt.getTime() - Date.now(), 0),
      realtimeConfig.streams.maxStreamLifetimeMs,
    );
    const expiry = setTimeout(endStream, lifetimeMs, stream);
    const close = () => {
      clearTimeout(expiry);
      closeStream();
    };
    stream.once('close', close);
    stream.on('error', close);

    stream.write(openingFrames);
    reply.raw.removeHeader('connection');
    return reply
      .header('content-type', 'text/event-stream')
      .header('cache-control', 'no-cache, no-transform')
      .header('x-accel-buffering', 'no')
      .send(stream);
  }

  fastify.get<{ Querystring: StreamTopicsQueryDto }>(
    '/v1/events',
    {
      schema: { querystring: streamTopicsQueryDtoSchema, tags: ['Realtime'] },
      preValidation: [requireAuth],
    },
    async (request, reply) => openStream(request, reply),
  );
}
