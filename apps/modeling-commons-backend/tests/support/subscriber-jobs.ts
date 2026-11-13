import type { FastifyInstance } from 'fastify';
import { subscriberQueues } from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';
import { pollUntil } from './poll.ts';

const subscriberQueueNames: Array<string> = subscriberQueues.map(({ queueName }) => queueName);

export async function waitForEventsDispatched(
  server: FastifyInstance,
  timeoutMs = 10_000,
): Promise<void> {
  const { prisma, jobQueue } = server.diContainer.cradle;
  await pollUntil(
    async () => {
      const events = await prisma.event.findMany({ select: { id: true } });
      const rows = await jobQueue.findJobStates(
        subscriberQueueNames.flatMap((name) => [name, getDeadLetterQueueName(name)]),
        'eventId',
        events.map((event) => event.id),
      );
      return rows.filter((row) => subscriberQueueNames.includes(row.queue));
    },
    (live) => live.length > 0 && live.every((row) => row.state === 'completed'),
    { timeoutMs, intervalMs: 200 },
  );
}
