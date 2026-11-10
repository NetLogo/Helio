import { PassThrough } from 'node:stream';
import realtimeConfig from '#src/config/realtime.ts';
import { TooManyRequestsException } from '#src/shared/exceptions/index.ts';
import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { resolveModel } from '#src/shared/hooks/resolve-model.ts';
import { computeStreamLifetimeMs } from '#src/shared/realtime/stream-lifetime.ts';
import { formatCommentFrame, formatRetryFrame } from '#src/shared/realtime/sse-frame.ts';
import { buildModelTopic, buildUserTopic } from '#src/shared/realtime/topics.ts';
import { idSchema } from '#src/shared/utils/id.ts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Type, type Static } from 'typebox';

const modelStreamParamsSchema = Type.Object({ id: idSchema() });
type ModelStreamParams = Static<typeof modelStreamParamsSchema>;

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
  const { realtimeBroker } = fastify.diContainer.cradle;

  fastify.addHook('preClose', async () => {
    realtimeBroker.endAll();
  });

  function openStream(request: FastifyRequest, reply: FastifyReply, modelTopics: Array<string>) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: userId } = request.user!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { expiresAt } = request.authSession!;
    const topics = [buildUserTopic(userId), ...modelTopics];
    const stream = new PassThrough();
    const unsubscribe = realtimeBroker.subscribe({
      userId,
      topics,
      write: (frame) => writeFrame(stream, frame),
      end: () => stream.end(),
    });
    if (!unsubscribe) {
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
      unsubscribe();
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

  fastify.get(
    '/v1/events',
    {
      schema: { tags: ['Realtime'] },
      preHandler: [requireAuth],
    },
    async (request, reply) => openStream(request, reply, []),
  );

  fastify.get<{ Params: ModelStreamParams }>(
    '/v1/events/models/:id',
    {
      schema: { params: modelStreamParamsSchema, tags: ['Realtime'] },
      preHandler: [requireAuth, resolveModel('read')],
    },
    async (request, reply) => openStream(request, reply, [buildModelTopic(request.params.id)]),
  );
}
