import { describe, it, expect } from 'vitest';
import { CronExpressionParser } from 'cron-parser';
import type { QueueOptions } from 'pg-boss';
import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';
import { DAY_S } from '#src/shared/utils/consts.ts';
import { getDeadLetterQueueName } from '#src/workers/queues.ts';

const PG_BOSS_DEFAULT_RETENTION_SECONDS = 14 * DAY_S;

const {
  schema: _schema,
  apiPoolSize: _apiPoolSize,
  polling: _polling,
  deadLetter: _deadLetter,
  retiredQueueNames,
  ...queueWorkers
} = workersConfig;
const workers = Object.values(queueWorkers);
const cronWorkers = Object.entries(queueWorkers).flatMap(([name, worker]) =>
  'cronExpression' in worker ? [[name, worker] as const] : [],
);

function computeFanOutWorstCaseSeconds(): number {
  const { retryLimit, retryDelay, expireInSeconds } = workersConfig.queueNotificationDigests.queue;
  return (retryLimit + 1) * expireInSeconds + retryLimit * retryDelay;
}

describe('workersConfig', () => {
  it('gives every worker its own queue', () => {
    const queueNames = workers.map((worker) => worker.queueName);
    expect(new Set(queueNames).size).toBe(queueNames.length);
  });

  it('keeps queue, dead-letter and retired names distinct from one another', () => {
    const names = [
      ...workers.map((worker) => worker.queueName),
      ...workers.map((worker) => getDeadLetterQueueName(worker.queueName)),
      ...retiredQueueNames,
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(cronWorkers)('schedules %s on a valid five-field cron expression', (_name, worker) => {
    expect(worker.cronExpression.trim().split(/\s+/)).toHaveLength(5);
    expect(() => CronExpressionParser.parse(worker.cronExpression)).not.toThrow();
  });

  it('rejects a malformed cron expression', () => {
    expect(() => CronExpressionParser.parse('61 * * * *')).toThrow();
  });

  it('fits every digest fan-out retry, each run to its expiry, before midnight UTC', () => {
    const { cronExpression, queue } = workersConfig.queueNotificationDigests;
    const start = CronExpressionParser.parse(cronExpression, { tz: 'UTC' }).next().toDate();
    const end = new Date(start.getTime() + computeFanOutWorstCaseSeconds() * 1000);

    expect(end.getUTCDate()).toBe(start.getUTCDate());
    expect(queue.retryBackoff).toBe(false);
  });

  it('finishes every send-digest retry from the latest fan-out before the next fan-out', () => {
    const { cronExpression } = workersConfig.queueNotificationDigests;
    const { retryLimit, retryDelay, retryDelayMax, expireInSeconds } =
      workersConfig.sendDigest.queue;
    const schedule = CronExpressionParser.parse(cronExpression, { tz: 'UTC' });
    const start = schedule.next().toDate();
    const nextStart = schedule.next().toDate();
    const retryWindowSeconds = Array.from({ length: retryLimit }, (_, attempt) =>
      Math.min(retryDelayMax, retryDelay * 2 ** (attempt + 1)),
    ).reduce((total, delay) => total + delay, 0);
    const sendDigestWorstCaseSeconds = (retryLimit + 1) * expireInSeconds + retryWindowSeconds;
    const end = new Date(
      start.getTime() + (computeFanOutWorstCaseSeconds() + sendDigestWorstCaseSeconds) * 1000,
    );

    expect(end.getTime()).toBeLessThan(nextStart.getTime());
  });

  it('keeps one send-digest job per recipient per UTC day', () => {
    expect(workersConfig.sendDigest.singletonSeconds).toBe(DAY_S);
  });

  it('keeps notifications longer than the digest window', () => {
    expect(workersConfig.notificationJanitor.retentionMs).toBeGreaterThan(
      notificationsConfig.windowMs,
    );
  });

  it('keeps sent email jobs for 30 days', () => {
    expect(workersConfig.sendEmail.queue.deleteAfterSeconds).toBe(30 * DAY_S);
  });

  it('keeps dead-letter copies for 30 days', () => {
    expect(workersConfig.deadLetter.retentionSeconds).toBe(30 * DAY_S);
  });

  it('finishes every email retry before the waiting job is deleted', () => {
    const queue: QueueOptions = workersConfig.sendEmail.queue;
    const { retryLimit, retryDelay, retryDelayMax } = workersConfig.sendEmail.queue;
    const retentionSeconds = queue.retentionSeconds ?? PG_BOSS_DEFAULT_RETENTION_SECONDS;
    const retryWindowSeconds = Array.from({ length: retryLimit }, (_, attempt) =>
      Math.min(retryDelayMax, retryDelay * 2 ** (attempt + 1)),
    ).reduce((total, delay) => total + delay, 0);

    expect(retryWindowSeconds).toBeLessThan(retentionSeconds);
  });

  it('polls no faster than the pg-boss minimum of half a second', () => {
    expect(workersConfig.polling.intervalSeconds).toBeGreaterThanOrEqual(0.5);
  });

  it('polls every worker that sets its own interval no faster than the pg-boss minimum', () => {
    const intervals = workers.flatMap((worker) =>
      'work' in worker && 'pollingIntervalSeconds' in worker.work
        ? [worker.work.pollingIntervalSeconds]
        : [],
    );
    expect(intervals.length).toBeGreaterThan(0);
    for (const interval of intervals) expect(interval).toBeGreaterThanOrEqual(0.5);
  });

  it('runs the notification janitor weekly on Sunday at 04:00', () => {
    expect(workersConfig.notificationJanitor.cronExpression).toBe('0 4 * * 0');
  });
});
