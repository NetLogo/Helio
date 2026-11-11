import workersConfig from '#src/config/workers.ts';
import { isRecord } from '#src/shared/utils/json.ts';
import type { PgBoss, QueueOptions } from 'pg-boss';

export type QueueEntry = {
  queueName: string;
  queue: QueueOptions;
};

export type SubscriberEntry = QueueEntry & { subscribesTo: ReadonlyArray<string> };

export function getDeadLetterQueueName(queueName: string): string {
  return `${queueName}-dead`;
}

export async function registerQueue(
  boss: Pick<PgBoss, 'createQueue' | 'updateQueue'>,
  entry: QueueEntry,
): Promise<void> {
  const deadLetterOptions = workersConfig.deadLetter;
  const deadLetterQueueName = getDeadLetterQueueName(entry.queueName);
  const queueOptions = { ...entry.queue, deadLetter: deadLetterQueueName };

  await boss.createQueue(deadLetterQueueName, deadLetterOptions);
  await boss.createQueue(entry.queueName, queueOptions);
  await boss.updateQueue(deadLetterQueueName, deadLetterOptions);
  await boss.updateQueue(entry.queueName, queueOptions);
}

export async function registerSendQueues(
  boss: Pick<PgBoss, 'createQueue' | 'updateQueue'>,
): Promise<void> {
  await registerQueue(boss, workersConfig.sendEmail);
}

export function listSubscriberEntries(config: object = workersConfig): Array<SubscriberEntry> {
  return Object.values(config).filter(
    (value): value is SubscriberEntry => isRecord(value) && 'subscribesTo' in value,
  );
}

export async function registerSubscriptions(
  boss: Pick<PgBoss, 'createQueue' | 'updateQueue' | 'subscribe'>,
): Promise<void> {
  for (const entry of listSubscriberEntries()) {
    await registerQueue(boss, entry);
    await Promise.all(
      entry.subscribesTo.map(async (eventType) => boss.subscribe(eventType, entry.queueName)),
    );
  }
}

export async function retireQueues(
  boss: Pick<PgBoss, 'unschedule'>,
  queueNames: ReadonlyArray<string>,
): Promise<void> {
  await Promise.all(queueNames.map(async (name) => boss.unschedule(name)));
}
