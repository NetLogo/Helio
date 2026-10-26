import { describe, it, expect } from 'vitest';
import { CronExpressionParser } from 'cron-parser';
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
});
