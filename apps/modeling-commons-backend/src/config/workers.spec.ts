import { describe, it, expect } from 'vitest';
import { CronExpressionParser } from 'cron-parser';
import notificationsConfig from '#src/config/notifications.ts';
import workersConfig from '#src/config/workers.ts';

const workers = Object.entries(workersConfig);

describe('workersConfig', () => {
  it('gives every worker its own queue', () => {
    const queueNames = workers.map(([, worker]) => worker.queueName);
    expect(new Set(queueNames).size).toBe(queueNames.length);
  });

  it.each(workers)('schedules %s on a valid five-field cron expression', (_name, worker) => {
    expect(worker.cronExpression.trim().split(/\s+/)).toHaveLength(5);
    expect(() => CronExpressionParser.parse(worker.cronExpression)).not.toThrow();
  });

  it('rejects a malformed cron expression', () => {
    expect(() => CronExpressionParser.parse('61 * * * *')).toThrow();
  });

  it('fits every digest retry, each run to its expiry, before midnight UTC', () => {
    const digest = workersConfig.digestProcessor;
    const start = CronExpressionParser.parse(digest.cronExpression, { tz: 'UTC' }).next().toDate();
    const worstCaseSeconds =
      (digest.retryLimit + 1) * digest.expireInSeconds +
      digest.retryLimit * digest.retryDelaySeconds;
    const end = new Date(start.getTime() + worstCaseSeconds * 1000);

    expect(end.getUTCDate()).toBe(start.getUTCDate());
  });

  it('keeps notifications longer than the digest window', () => {
    expect(workersConfig.notificationJanitor.retentionMs).toBeGreaterThan(
      notificationsConfig.windowMs,
    );
  });

  it('keeps queued emails past the whole retry span of the email sender', () => {
    const sender = workersConfig.emailSender;
    const retrySpanMs = sender.retryBaseMs * (2 ** sender.maxEmailAttempts - 1);
    const janitor = workersConfig.notificationJanitor;

    expect(janitor.sentEmailRetentionMs).toBeGreaterThan(retrySpanMs);
    expect(janitor.failedEmailRetentionMs).toBeGreaterThan(retrySpanMs);
  });

  it('runs the notification janitor weekly on Sunday at 04:00', () => {
    expect(workersConfig.notificationJanitor.cronExpression).toBe('0 4 * * 0');
  });
});
