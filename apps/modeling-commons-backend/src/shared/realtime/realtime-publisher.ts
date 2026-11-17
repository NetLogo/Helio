import realtimeConfig from '#src/config/realtime.ts';
import type { PrismaTransactionClient } from '#src/lib/prisma.ts';
import { buildTopicMessages } from '#src/shared/realtime/realtime-message.ts';
import type { AnyRealtimeTopic, PublishedEvent } from '#src/shared/realtime/realtime-topic.ts';

export async function notifyRealtime(
  client: Pick<PrismaTransactionClient, '$executeRaw'>,
  events: ReadonlyArray<PublishedEvent>,
  topics: ReadonlyArray<AnyRealtimeTopic>,
): Promise<void> {
  const payloads = events
    .flatMap((event) => buildTopicMessages(event, topics))
    .map((message) => JSON.stringify(message));
  if (payloads.length === 0) return;
  await client.$executeRaw`SELECT pg_notify(${realtimeConfig.channel}, payload) FROM unnest(${payloads}::text[]) AS payload`;
}
