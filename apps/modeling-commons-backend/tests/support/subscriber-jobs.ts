import type { FastifyInstance } from 'fastify';
import { getDeadLetterQueueName, listSubscriberEntries } from '#src/workers/queues.ts';

const subscriberQueueNames = listSubscriberEntries().map(({ queueName }) => queueName);

export async function waitForEventsDispatched(
  server: FastifyInstance,
  timeoutMs = 10_000,
): Promise<void> {
  const { prisma, jobQueue } = server.diContainer.cradle;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await prisma.event.findMany({ select: { id: true } });
    const rows = await jobQueue.findJobStates(
      subscriberQueueNames.flatMap((name) => [name, getDeadLetterQueueName(name)]),
      'eventId',
      events.map((event) => event.id),
    );
    const live = rows.filter((row) => subscriberQueueNames.includes(row.queue));
    if (live.length > 0 && live.every((row) => row.state === 'completed')) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Subscriber jobs for the recorded events did not complete within ${timeoutMs}ms`);
}
