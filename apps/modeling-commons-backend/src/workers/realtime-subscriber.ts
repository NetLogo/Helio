import realtimeConfig from '#src/config/realtime.ts';
import workersConfig from '#src/config/workers.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import type {
  EventJobData,
  EventRepositoryPort,
} from '#src/modules/event/database/event.repository.port.ts';
import { userNotificationEventTypes } from '#src/modules/event/domain/event-types.ts';
import { realtimeTopics } from '#src/modules/realtime-topics.ts';
import type { UserNotificationCreatedJobData } from '#src/modules/user-notification/domain/user-notification.types.ts';
import { buildTopicMessages } from '#src/shared/realtime/realtime-message.ts';
import type { PublishedEvent } from '#src/shared/realtime/realtime-topic.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { StreamMessage } from '@repo/modeling-commons-shared';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const config = workersConfig.realtime;

export type RealtimeJobData = EventJobData | UserNotificationCreatedJobData;

export function listRecipientEvents(recipientIds: ReadonlyArray<string>): Array<PublishedEvent> {
  return [...new Set(recipientIds)].map((id) => ({
    type: userNotificationEventTypes.created,
    resourceId: id,
  }));
}

export async function startRealtimeSubscriber({
  boss,
  db,
  eventRepository,
  logger,
}: {
  boss: PgBoss;
  db: Pick<ExtendedPrismaClient, '$executeRaw'>;
  eventRepository: EventRepositoryPort;
  logger: FastifyBaseLogger;
}): Promise<void> {
  async function loadEvents(eventId: string, jobId: string): Promise<Array<PublishedEvent>> {
    const event = await eventRepository.findOneById(eventId);
    if (event) return [event];
    logger.warn({ eventId, jobId }, 'Published event no longer exists');
    return [];
  }

  async function listJobMessages(data: RealtimeJobData, jobId: string) {
    const events =
      'recipientIds' in data
        ? listRecipientEvents(data.recipientIds)
        : await loadEvents(data.eventId, jobId);
    return events.flatMap((event) => buildTopicMessages(event, realtimeTopics));
  }

  async function notify(messages: ReadonlyArray<StreamMessage>): Promise<void> {
    if (messages.length === 0) return;
    const payloads = messages.map((message) => JSON.stringify(message));
    await db.$executeRaw`SELECT pg_notify(${realtimeConfig.channel}, payload) FROM unnest(${payloads}::text[]) AS payload`;
  }

  await registerQueue(boss, config);

  await boss.work<RealtimeJobData>(
    config.queueName,
    {
      batchSize: 1,
      localConcurrency: config.work.localConcurrency,
      pollingIntervalSeconds: config.work.pollingIntervalSeconds,
    },
    async (jobs) => {
      for (const { id: jobId, data } of jobs) {
        await notify(await listJobMessages(data, jobId));
      }
    },
  );

  logger.info('Realtime subscriber started');
}
