import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeNotificationEmailService from '#src/modules/user-notification/notification-email.service.ts';
import {
  fakeMarkEmailSent,
  mockUserNotificationRepository,
} from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import {
  mockTransactionManager,
  stageCommitEffect,
} from '#src/shared/test/mock-transaction-manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { NotificationRowsAlreadySentError } from '#src/modules/user-notification/domain/user-notification.errors.ts';

describe('notificationEmailService queueRows', () => {
  const sentIds = new Set<string>();
  let queued: Array<unknown> = [];
  const userNotificationRepository = mockUserNotificationRepository();
  const mailService = { enqueue: vi.fn() };
  const content = { to: 'recipient@example.test', subject: 'New comment' };

  const service = makeNotificationEmailService({
    userNotificationRepository,
    mailService,
    transactionManager: mockTransactionManager(),
  } as never);

  beforeEach(() => {
    sentIds.clear();
    queued = [];
    userNotificationRepository.markEmailSentTx
      .mockReset()
      .mockImplementation(fakeMarkEmailSent(sentIds));
    mailService.enqueue
      .mockReset()
      .mockImplementation(async (email: unknown, ctx: TransactionContext) => {
        stageCommitEffect(ctx, () => {
          queued.push(email);
        });
      });
  });

  it('marks the rows sent and queues their email in the same transaction', async () => {
    const buildEmail = vi.fn().mockResolvedValue(content);

    await service.queueRows(['a', 'b'], buildEmail);

    expect(buildEmail).toHaveBeenCalledWith(['a', 'b']);
    expect([...sentIds].sort()).toEqual(['a', 'b']);
    expect(queued).toEqual([content]);
  });

  it('rolls back and queues nothing when some of the rows were already sent', async () => {
    sentIds.add('done');

    await expect(
      service.queueRows(['a', 'done'], vi.fn().mockResolvedValue(content)),
    ).rejects.toBeInstanceOf(NotificationRowsAlreadySentError);

    expect([...sentIds]).toEqual(['done']);
    expect(queued).toEqual([]);
  });

  it('queues nothing and succeeds when every row was already sent', async () => {
    sentIds.add('a');

    await service.queueRows(['a'], vi.fn().mockResolvedValue(content));

    expect([...sentIds]).toEqual(['a']);
    expect(queued).toEqual([]);
  });

  it('builds the email from the candidate rows before marking any of them', async () => {
    const buildEmail = vi.fn().mockImplementation(async () => {
      expect(userNotificationRepository.markEmailSentTx).not.toHaveBeenCalled();
      return content;
    });

    await service.queueRows(['a', 'b'], buildEmail);

    expect(buildEmail).toHaveBeenCalledWith(['a', 'b']);
  });

  it('leaves the rows unsent and rethrows when building the email fails', async () => {
    const renderError = new Error('render failed');

    await expect(service.queueRows(['a'], vi.fn().mockRejectedValue(renderError))).rejects.toBe(
      renderError,
    );

    expect(sentIds.size).toBe(0);
    expect(queued).toEqual([]);
  });

  it('leaves the rows unsent and rethrows when queueing the email fails', async () => {
    const dbError = new Error('database unreachable');
    mailService.enqueue.mockRejectedValue(dbError);

    await expect(service.queueRows(['a'], vi.fn().mockResolvedValue(content))).rejects.toBe(
      dbError,
    );

    expect(sentIds.size).toBe(0);
    expect(queued).toEqual([]);
  });

  it('keeps the rows sent without queueing when the builder has nothing left to say', async () => {
    await service.queueRows(['a'], vi.fn().mockResolvedValue(null));

    expect([...sentIds]).toEqual(['a']);
    expect(queued).toEqual([]);
  });
});
