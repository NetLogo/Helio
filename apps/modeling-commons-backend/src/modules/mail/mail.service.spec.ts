import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#src/lib/mail.ts', () => ({ default: { sendMail: vi.fn() } }));

import makeMailService from '#src/modules/mail/mail.service.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

describe('mailService.enqueue', () => {
  const jobQueue = {
    sendTx: vi.fn().mockResolvedValue('job-1'),
  };
  const logger = { error: vi.fn(), info: vi.fn() };
  const service = makeMailService({ jobQueue, logger } as never);
  const content = { to: 'recipient@example.test', subject: 'New comment' };
  const ctx = Object.create(null) as TransactionContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a send-email job inside the caller transaction', async () => {
    await service.enqueue(content, ctx);

    expect(jobQueue.sendTx).toHaveBeenCalledWith(ctx, 'send-email', content);
  });

  it('fails the enqueue when the job cannot be sent', async () => {
    const queueError = new Error('queue unreachable');
    jobQueue.sendTx.mockRejectedValueOnce(queueError);

    await expect(service.enqueue(content, ctx)).rejects.toBe(queueError);
  });
});
