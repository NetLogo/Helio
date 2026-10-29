import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';

const bossInstance = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  work: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  send: vi.fn().mockResolvedValue('job-1'),
  stop: vi.fn().mockResolvedValue(undefined),
  createQueue: vi.fn().mockResolvedValue(undefined),
};

vi.mock('pg-boss', () => ({
  PgBoss: class {
    constructor() {
      return bossInstance;
    }
  },
}));

import { startEmailSender } from '#src/workers/email-sender.ts';
import { mockEmailQueueRepository } from '#src/modules/mail/database/email-queue.repository.mock.ts';
import makeQueueNotifier from '#src/shared/jobs/queue.notifier.ts';
import workersConfig from '#src/config/workers.ts';

const logger = {
  info: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as FastifyBaseLogger;

const config = workersConfig.emailSender;

function makeMailService(): { sendMailAsync: ReturnType<typeof vi.fn> } {
  return { sendMailAsync: vi.fn().mockResolvedValue({ messageId: 'sent' }) };
}

function emails(
  count: number,
  attempts = 0,
): Array<{ id: string; content: { to: string }; attempts: number }> {
  return Array.from({ length: count }, (_, index) => ({
    id: `email-${index}`,
    content: { to: `user-${index}@example.test` },
    attempts,
  }));
}

async function start({
  emailQueueRepository = mockEmailQueueRepository(),
  mailService = makeMailService(),
} = {}) {
  const emailQueueNotifier = makeQueueNotifier();
  await startEmailSender({
    connectionString: 'postgres://test',
    emailQueueRepository: emailQueueRepository as never,
    mailService: mailService as never,
    emailQueueNotifier,
    logger,
  });

  const handler = bossInstance.work.mock.calls[0]![1] as () => Promise<void>;
  return { handler, emailQueueRepository, mailService, emailQueueNotifier };
}

describe('startEmailSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts pg-boss, registers a worker, and schedules the queue', async () => {
    await start();

    expect(bossInstance.start).toHaveBeenCalledTimes(1);
    expect(bossInstance.createQueue).toHaveBeenCalledWith('send-emails', { policy: 'short' });
    expect(bossInstance.work).toHaveBeenCalledWith('send-emails', expect.any(Function));
    expect(bossInstance.schedule).toHaveBeenCalledWith('send-emails', '*/1 * * * *');
  });

  it('fetches within the configured batch size and attempt ceiling', async () => {
    const { handler, emailQueueRepository } = await start();
    await handler();

    expect(emailQueueRepository.findUnsent).toHaveBeenCalledWith(
      config.emailBatchSize,
      config.maxEmailAttempts,
      expect.any(Date),
    );
  });

  it('only fetches emails that are due as of the current time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00.000Z'));
    const { handler, emailQueueRepository } = await start();
    await handler();

    const [, , now] = emailQueueRepository.findUnsent.mock.calls[0]!;
    expect(now).toEqual(new Date('2026-10-28T12:00:00.000Z'));
  });

  it('sends each queued email, then marks it sent', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    const [first, second] = emails(2);
    emailQueueRepository.findUnsent.mockResolvedValue([first, second]);
    const order: Array<string> = [];
    const mailService = makeMailService();
    mailService.sendMailAsync.mockImplementation(async (content: { to: string }) => {
      order.push(`send ${content.to}`);
      return { messageId: content.to };
    });
    emailQueueRepository.markSent.mockImplementation(async (id: string) => {
      order.push(`mark ${id}`);
    });

    const { handler } = await start({ emailQueueRepository, mailService });
    await handler();

    expect(order).toEqual([
      'send user-0@example.test',
      'mark email-0',
      'send user-1@example.test',
      'mark email-1',
    ]);
    expect(emailQueueRepository.markSent).toHaveBeenCalledWith('email-0', expect.any(Date));
    expect(emailQueueRepository.markFailed).not.toHaveBeenCalled();
  });

  it('records a failed send against that email only and still sends the rest', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent.mockResolvedValue(emails(3));
    const smtpError = new Error('SMTP unreachable');
    const mailService = makeMailService();
    mailService.sendMailAsync
      .mockResolvedValueOnce({ messageId: 'a' })
      .mockRejectedValueOnce(smtpError)
      .mockResolvedValueOnce({ messageId: 'c' });

    const { handler } = await start({ emailQueueRepository, mailService });
    await handler();

    expect(emailQueueRepository.markFailed).toHaveBeenCalledTimes(1);
    expect(emailQueueRepository.markFailed).toHaveBeenCalledWith(
      'email-1',
      smtpError,
      expect.any(Date),
    );
    expect(emailQueueRepository.markSent.mock.calls.map(([id]) => id)).toEqual([
      'email-0',
      'email-2',
    ]);
  });

  it('fails the job without recording a send failure when marking a sent email fails', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent.mockResolvedValue(emails(2));
    const dbError = new Error('database unreachable');
    emailQueueRepository.markSent.mockRejectedValueOnce(dbError);

    const { handler, mailService } = await start({ emailQueueRepository });

    await expect(handler()).rejects.toBe(dbError);
    expect(emailQueueRepository.markFailed).not.toHaveBeenCalled();
    expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
  });

  it('schedules the next attempt with a delay that doubles per prior attempt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date('2026-10-28T12:00:00.000Z');
    vi.setSystemTime(now);
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent.mockResolvedValue(emails(1, 3));
    const mailService = makeMailService();
    mailService.sendMailAsync.mockRejectedValue(new Error('SMTP unreachable'));

    const { handler } = await start({ emailQueueRepository, mailService });
    await handler();

    const [, , nextAttemptAt] = emailQueueRepository.markFailed.mock.calls[0]!;
    expect(nextAttemptAt).toEqual(new Date(now.getTime() + 8 * config.retryBaseMs));
  });

  it('stops draining after a full pass in which no email was sent', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent.mockResolvedValue(emails(config.emailBatchSize));
    const mailService = makeMailService();
    mailService.sendMailAsync.mockRejectedValue(new Error('SMTP unreachable'));

    const { handler } = await start({ emailQueueRepository, mailService });
    await handler();

    expect(emailQueueRepository.findUnsent).toHaveBeenCalledTimes(1);
  });

  it('keeps draining while a full batch comes back', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent
      .mockResolvedValueOnce(emails(config.emailBatchSize))
      .mockResolvedValueOnce(emails(config.emailBatchSize))
      .mockResolvedValueOnce(emails(3));

    const { handler } = await start({ emailQueueRepository });
    await handler();

    expect(emailQueueRepository.findUnsent).toHaveBeenCalledTimes(3);
  });

  it('stops draining after the pass ceiling so a failing batch cannot spin forever', async () => {
    const emailQueueRepository = mockEmailQueueRepository();
    emailQueueRepository.findUnsent.mockResolvedValue(emails(config.emailBatchSize));

    const { handler } = await start({ emailQueueRepository });
    await handler();

    expect(emailQueueRepository.findUnsent).toHaveBeenCalledTimes(config.maxDrainPasses);
  });

  it('binds the notifier so a nudge sends a drain job', async () => {
    const { emailQueueNotifier } = await start();
    await emailQueueNotifier.nudge();

    expect(bossInstance.send).toHaveBeenCalledWith('send-emails', {});
  });
});
