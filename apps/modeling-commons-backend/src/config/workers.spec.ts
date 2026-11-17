import { describe, it, expect } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';

const {
  schema: _schema,
  apiPoolSize: _apiPoolSize,
  deadLetter: _deadLetter,
  ...queueWorkers
} = workersConfig;
const workers = Object.values(queueWorkers);

describe('workersConfig', () => {
  it('gives every worker its own queue', () => {
    const queueNames = workers.map((worker) => worker.queueName);
    expect(new Set(queueNames).size).toBe(queueNames.length);
  });

  it('keeps queue and dead-letter names distinct from one another', () => {
    const names = [
      ...workers.map((worker) => worker.queueName),
      ...workers.map((worker) => getDeadLetterQueueName(worker.queueName)),
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps notifications longer than the digest window', () => {
    expect(workersConfig.notificationJanitor.retentionMs).toBeGreaterThan(
      notificationsConfig.windowMs,
    );
  });
});
