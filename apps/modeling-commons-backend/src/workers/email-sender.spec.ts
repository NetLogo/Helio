import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';
import type { PgBoss } from 'pg-boss';
import { startEmailSender } from '#src/workers/email-sender.ts';
import workersConfig from '#src/config/workers.ts';

const bossInstance = {
  work: vi.fn().mockResolvedValue('worker-1'),
  schedule: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
  updateQueue: vi.fn().mockResolvedValue(undefined),
};

const boss = bossInstance as unknown as PgBoss;

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

type Handler = (jobs: Array<{ id: string; data: { to: string } }>) => Promise<unknown>;

const content = { to: 'recipient@example.test', subject: 'New comment' };

async function start() {
  const mailService = { sendMailAsync: vi.fn().mockResolvedValue({ messageId: 'sent' }) };

  await startEmailSender({ boss, mailService, logger });

  const handler = bossInstance.work.mock.calls[0]![2] as Handler;
  const run = async () => handler([{ id: 'job-1', data: content }]);
  return { run, mailService };
}

describe('startEmailSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the send-email queue with its dead letter', async () => {
    await start();

    expect(bossInstance.createQueue).toHaveBeenCalledWith(
      'send-email-dead',
      workersConfig.deadLetter,
    );
    expect(bossInstance.createQueue).toHaveBeenCalledWith('send-email', {
      ...workersConfig.sendEmail.queue,
      deadLetter: 'send-email-dead',
    });
  });

  it('works one job at a time with local concurrency and no schedule', async () => {
    await start();

    expect(bossInstance.work).toHaveBeenCalledWith(
      'send-email',
      {
        batchSize: 1,
        localConcurrency: workersConfig.sendEmail.work.localConcurrency,
        pollingIntervalSeconds: workersConfig.polling.intervalSeconds,
      },
      expect.any(Function),
    );
    expect(bossInstance.schedule).not.toHaveBeenCalled();
  });

  it('sends the job data as the mail', async () => {
    const { run, mailService } = await start();

    await run();

    expect(mailService.sendMailAsync).toHaveBeenCalledExactlyOnceWith(content);
  });

  it('lets a send error propagate so pg-boss retries the job', async () => {
    const { run, mailService } = await start();
    const error = new Error('SMTP unreachable');
    mailService.sendMailAsync.mockRejectedValue(error);

    await expect(run()).rejects.toBe(error);
  });
});
