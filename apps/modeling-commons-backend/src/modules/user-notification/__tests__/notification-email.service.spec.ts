import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeNotificationEmailService from '#src/modules/user-notification/email/notification-email.service.ts';
import {
  fakeMarkEmailSent,
  mockUserNotificationRepository,
} from '#src/modules/user-notification/core/database/user-notification.repository.mock.ts';
import {
  mockTransactionManager,
  stageCommitEffect,
} from '#src/shared/test/mock-transaction-manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import { NotificationsAlreadySentError } from '#src/modules/user-notification/core/notification.errors.ts';

describe('notificationEmailService queueNotifications', () => {
  const sentIds = new Set<string>();
  let queued: Array<unknown> = [];
  const userNotificationRepository = mockUserNotificationRepository();
  const mailService = { enqueue: vi.fn() };
  const content = { to: 'recipient@example.test', subject: 'New comment' };
  const mailDomain = {
    withOneClickUnsubscribe: vi.fn((email: object, url: string) => ({
      ...email,
      headers: { 'List-Unsubscribe': url },
    })),
  };
  const queuedEmail = {
    categories: ['comment.on_your_model' as const],
    render: vi.fn().mockResolvedValue(content),
  };

  const service = makeNotificationEmailService({
    userNotificationRepository,
    mailService,
    mailDomain,
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

  it('marks the notifications sent and queues their email in the same transaction', async () => {
    await service.queueNotifications('user-1', ['a', 'b'], queuedEmail);

    expect([...sentIds].sort()).toEqual(['a', 'b']);
    expect(queued).toEqual([
      {
        ...content,
        headers: { 'List-Unsubscribe': expect.stringContaining('/') },
      },
    ]);
    expect(queuedEmail.render).toHaveBeenCalledWith(
      expect.objectContaining({
        unsubscribeUrl: expect.any(String),
        oneClickUnsubscribeUrl: expect.any(String),
        preferencesUrl: expect.any(String),
      }),
    );
  });

  it('rolls back and queues nothing when some of the notifications were already sent', async () => {
    sentIds.add('done');

    await expect(
      service.queueNotifications('user-1', ['a', 'done'], queuedEmail),
    ).rejects.toBeInstanceOf(NotificationsAlreadySentError);

    expect([...sentIds]).toEqual(['done']);
    expect(queued).toEqual([]);
  });

  it('queues nothing and succeeds when every notification was already sent', async () => {
    sentIds.add('a');

    await service.queueNotifications('user-1', ['a'], queuedEmail);

    expect([...sentIds]).toEqual(['a']);
    expect(queued).toEqual([]);
  });

  it('leaves the notifications unsent and rethrows when queueing the email fails', async () => {
    const dbError = new Error('database unreachable');
    mailService.enqueue.mockRejectedValue(dbError);

    await expect(service.queueNotifications('user-1', ['a'], queuedEmail)).rejects.toBe(dbError);

    expect(sentIds.size).toBe(0);
    expect(queued).toEqual([]);
  });

  it('keeps the notifications sent without queueing when the builder has nothing left to say', async () => {
    await service.queueNotifications('user-1', ['a'], null);

    expect([...sentIds]).toEqual(['a']);
    expect(queued).toEqual([]);
  });
});
