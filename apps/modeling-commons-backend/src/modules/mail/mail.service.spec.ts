import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#src/lib/mail.ts', () => ({ default: { sendMail: vi.fn() } }));

import makeMailService from '#src/modules/mail/mail.service.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';

describe('mailService.enqueue', () => {
  const jobQueue = {
    send: vi.fn().mockResolvedValue('job-1'),
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
    expect(jobQueue.send).not.toHaveBeenCalled();
  });

  it('sends a send-email job on its own when there is no transaction', async () => {
    await service.enqueue(content);

    expect(jobQueue.send).toHaveBeenCalledWith('send-email', content);
    expect(jobQueue.sendTx).not.toHaveBeenCalled();
  });

  it.each([
    ['inside the caller transaction', ctx, 'sendTx'],
    ['on its own', undefined, 'send'],
  ] as const)('fails the enqueue when no job was created %s', async (_label, context, method) => {
    jobQueue[method].mockResolvedValueOnce(null);

    await expect(service.enqueue(content, context)).rejects.toThrow(
      'No send-email job was created',
    );
  });

  it('fails the enqueue when the job cannot be sent', async () => {
    const queueError = new Error('queue unreachable');
    jobQueue.sendTx.mockRejectedValueOnce(queueError);

    await expect(service.enqueue(content, ctx)).rejects.toBe(queueError);
  });
});
