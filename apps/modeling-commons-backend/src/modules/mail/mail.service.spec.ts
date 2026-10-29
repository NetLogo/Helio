import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#src/lib/mail.ts', () => ({ default: { sendMail: vi.fn() } }));

import makeMailService from '#src/modules/mail/mail.service.ts';
import { mockEmailQueueRepository } from '#src/modules/mail/database/email-queue.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';

describe('mailService.enqueue', () => {
  const emailQueueRepository = mockEmailQueueRepository();
  const emailQueueNotifier = { bind: vi.fn(), nudge: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn(), info: vi.fn() };
  const service = makeMailService({ emailQueueRepository, emailQueueNotifier, logger } as never);
  const content = { to: 'recipient@example.test', subject: 'New comment' };

  beforeEach(() => {
    vi.clearAllMocks();
    emailQueueRepository.insertTx.mockResolvedValue({ id: 'email-1', content });
    emailQueueNotifier.nudge.mockResolvedValue(undefined);
  });

  it('inserts inside the caller transaction and nudges the sender only after commit', async () => {
    const nudgedBeforeCommit = await mockTransactionManager().run(async (ctx) => {
      await service.enqueue(content, ctx);
      expect(emailQueueRepository.insertTx).toHaveBeenCalledWith(content, ctx);
      return emailQueueNotifier.nudge.mock.calls.length;
    });

    expect(nudgedBeforeCommit).toBe(0);
    expect(emailQueueNotifier.nudge).toHaveBeenCalledTimes(1);
  });

  it('nudges right away when there is no transaction', async () => {
    await service.enqueue(content);

    expect(emailQueueRepository.insertTx).toHaveBeenCalledWith(content, undefined);
    expect(emailQueueNotifier.nudge).toHaveBeenCalledTimes(1);
  });

  it('does not nudge when the insert fails', async () => {
    const dbError = new Error('database unreachable');
    emailQueueRepository.insertTx.mockRejectedValue(dbError);

    await expect(service.enqueue(content)).rejects.toBe(dbError);
    expect(emailQueueNotifier.nudge).not.toHaveBeenCalled();
  });

  it('logs a failed nudge instead of failing the enqueue, since the cron still drains the row', async () => {
    const queueError = new Error('queue unreachable');
    emailQueueNotifier.nudge.mockRejectedValue(queueError);

    await expect(service.enqueue(content)).resolves.toBeUndefined();
    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: queueError }));
    });
  });
});
