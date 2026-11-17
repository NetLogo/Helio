import { describe, it, expect, vi, beforeEach } from 'vitest';
import workersConfig from '#src/config/workers.ts';
import notificationsConfig from '#src/config/notifications.ts';
import makeNotificationPreferenceUpdateService from '#src/modules/user-notification/delivery/notification-preference-update.service.ts';
import makeNotificationPreferencesService from '#src/modules/user-notification/preferences/notification-preferences.service.ts';
import {
  makePreferenceRecord,
  mockNotificationPreferenceRepository,
} from '#src/modules/user-notification/preferences/database/notification-preference.repository.mock.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import type { SendDigestJobData } from '#src/modules/user-notification/user-notification.events.ts';
import {
  mockTransactionManager,
  stageCommitEffect,
} from '#src/shared/test/mock-transaction-manager.ts';
import type { TransactionContext } from '#src/shared/db/transaction.port.ts';
import type { EmailMode } from '#prisma/index';

describe('notificationPreferenceUpdateService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const transactionManager = mockTransactionManager();
  const jobQueue = { sendTx: vi.fn() };
  let committedJobs: Array<{ queue: string; data: SendDigestJobData }> = [];
  let jobContexts: Array<TransactionContext> = [];

  const service = makeNotificationPreferenceUpdateService({
    transactionManager,
    notificationPreferencesService: makeNotificationPreferencesService({
      transactionManager,
      notificationPreferenceRepository,
      userNotificationMapper: userNotificationMapper(),
    } as never),
    jobQueue,
  } as never);

  function storeModes(email: EmailMode, ...categories: Array<string>) {
    notificationPreferenceRepository.findAllByUserTx.mockResolvedValue(
      categories.map((category) =>
        makePreferenceRecord({ userId: 'recipient-1', category, email }),
      ),
    );
  }

  beforeEach(() => {
    committedJobs = [];
    jobContexts = [];
    notificationPreferenceRepository.findAllByUserTx.mockReset().mockResolvedValue([]);
    notificationPreferenceRepository.upsertTx.mockReset().mockResolvedValue(undefined);
    jobQueue.sendTx
      .mockReset()
      .mockImplementation(async (ctx: TransactionContext, queue: string, data: object) => {
        jobContexts.push(ctx);
        stageCommitEffect(ctx, () => {
          committedJobs.push({ queue, data: data as SendDigestJobData });
        });
        return 'job-1';
      });
  });

  it('enqueues one send-digest job for the switched-on categories over the pending window', async () => {
    storeModes('off', 'comment.on_your_model', 'comment.reply_to_you');
    const before = Date.now();

    await service.updatePreferences('recipient-1', [
      { category: 'comment.on_your_model', email: 'immediate' },
      { category: 'comment.reply_to_you', email: 'daily' },
    ]);

    expect(committedJobs).toHaveLength(1);
    const { queue, data } = committedJobs[0]!;
    expect(queue).toBe(workersConfig.sendDigest.queueName);
    expect(data.recipientId).toBe('recipient-1');
    expect(data.categories).toEqual(['comment.on_your_model', 'comment.reply_to_you']);
    const until = new Date(data.until).getTime();
    expect(until).toBeGreaterThanOrEqual(before);
    expect(until - new Date(data.since).getTime()).toBe(notificationsConfig.windowMs);
  });

  it('enqueues the job in the transaction that writes the preferences', async () => {
    storeModes('off', 'comment.on_your_model');

    await service.updatePreferences('recipient-1', [
      { category: 'comment.on_your_model', email: 'immediate' },
    ]);

    const [writeCtx] = notificationPreferenceRepository.upsertTx.mock.calls[0]!;
    expect(jobContexts).toEqual([writeCtx]);
  });

  it('enqueues nothing when the preference write fails', async () => {
    storeModes('off', 'comment.on_your_model');
    notificationPreferenceRepository.upsertTx.mockRejectedValue(new Error('write failed'));

    await expect(
      service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
      ]),
    ).rejects.toThrow('write failed');

    expect(jobQueue.sendTx).not.toHaveBeenCalled();
    expect(committedJobs).toEqual([]);
  });

  it('rejects, so the update rolls back, when the job cannot be enqueued', async () => {
    storeModes('off', 'comment.on_your_model');
    jobQueue.sendTx.mockRejectedValue(new Error('queue unreachable'));

    await expect(
      service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
      ]),
    ).rejects.toThrow('queue unreachable');

    expect(committedJobs).toEqual([]);
  });

  it.each<[EmailMode, EmailMode]>([
    ['daily', 'off'],
    ['immediate', 'off'],
    ['daily', 'daily'],
    ['immediate', 'immediate'],
  ])('enqueues nothing when %s is saved as %s', async (from, to) => {
    storeModes(from, 'comment.on_your_model');

    await service.updatePreferences('recipient-1', [
      { category: 'comment.on_your_model', email: to },
    ]);

    expect(jobQueue.sendTx).not.toHaveBeenCalled();
  });

  it('enqueues nothing for an in-app only toggle', async () => {
    storeModes('daily', 'comment.on_your_model');

    await service.updatePreferences('recipient-1', [
      { category: 'comment.on_your_model', inApp: false },
    ]);

    expect(jobQueue.sendTx).not.toHaveBeenCalled();
  });
});
