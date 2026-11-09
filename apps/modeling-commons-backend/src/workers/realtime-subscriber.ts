import realtimeConfig from '#src/config/realtime.ts';
import workersConfig from '#src/config/workers.ts';
import type { ExtendedPrismaClient } from '#src/lib/prisma.ts';
import type {
  EventJobData,
  EventRecord,
  EventRepositoryPort,
} from '#src/modules/event/database/event.repository.port.ts';
import { modelCommentEventTypes } from '#src/modules/event/domain/event-types.ts';
import type { UserNotificationCreatedJobData } from '#src/modules/user-notification/domain/user-notification.types.ts';
import { registerQueue } from '#src/workers/queues.ts';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';

const config = workersConfig.realtime;
const modelCommentTypes: ReadonlyArray<string> = Object.values(modelCommentEventTypes);

export type RealtimeJobData = EventJobData | UserNotificationCreatedJobData;

export type RealtimeSignal = { channel: string; payload: string };

export function listEventSignals(
  event: Pick<EventRecord, 'type' | 'resourceId'>,
): Array<RealtimeSignal> {
  if (!modelCommentTypes.includes(event.type)) return [];
  return [{ channel: realtimeConfig.channels.model, payload: event.resourceId }];
}

export function listRecipientSignals(recipientIds: ReadonlyArray<string>): Array<RealtimeSignal> {
  return [...new Set(recipientIds)].map((id) => ({
    channel: realtimeConfig.channels.user,
    payload: id,
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
  async function loadEventSignals(eventId: string, jobId: string): Promise<Array<RealtimeSignal>> {
    const event = await eventRepository.findOneById(eventId);
    if (event) return listEventSignals(event);
    logger.warn({ eventId, jobId }, 'Published event no longer exists');
    return [];
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
        const signals =
          'recipientIds' in data
            ? listRecipientSignals(data.recipientIds)
            : await loadEventSignals(data.eventId, jobId);
        for (const signal of signals) {
          await db.$executeRaw`SELECT pg_notify(${signal.channel}, ${signal.payload})`;
        }
      }
    },
  );

  logger.info('Realtime subscriber started');
}
