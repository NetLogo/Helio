import workersConfig, { subscriberQueues, workerQueues } from '#src/config/workers.ts';
import type { PgBoss, QueueOptions } from 'pg-boss';

export type QueueConfig = {
  queueName: string;
  options: QueueOptions;
};

export function getDeadLetterQueueName(queueName: string): string {
  return `${queueName}-dead`;
}

export async function upsertQueueWithDeadLetter(
  boss: Pick<PgBoss, 'createQueue' | 'updateQueue'>,
  queueConfig: QueueConfig,
): Promise<void> {
  const deadLetterOptions = workersConfig.deadLetter;
  const deadLetterQueueName = getDeadLetterQueueName(queueConfig.queueName);
  const queueOptions = { ...queueConfig.options, deadLetter: deadLetterQueueName };

  await boss.createQueue(deadLetterQueueName, deadLetterOptions);
  await boss.createQueue(queueConfig.queueName, queueOptions);
  await boss.updateQueue(deadLetterQueueName, deadLetterOptions);
  await boss.updateQueue(queueConfig.queueName, queueOptions);
}

export async function registerQueues(
  boss: Pick<PgBoss, 'createQueue' | 'updateQueue' | 'subscribe'>,
): Promise<void> {
  for (const queueConfig of workerQueues) {
    await upsertQueueWithDeadLetter(boss, queueConfig);
  }
  for (const queueConfig of subscriberQueues) {
    await upsertQueueWithDeadLetter(boss, queueConfig);
    await Promise.all(
      queueConfig.subscribesTo.map(async (eventType) =>
        boss.subscribe(eventType, queueConfig.queueName),
      ),
    );
  }
}

