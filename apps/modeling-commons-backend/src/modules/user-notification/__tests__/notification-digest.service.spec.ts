import { makeSubjectsByNotificationId } from '#src/modules/user-notification/core/subjects.domain.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import links from '#src/config/links.ts';
import makeMailDomain from '#src/modules/mail/domain/mail.domain.ts';
import notificationsConfig from '#src/config/notifications.ts';
import makeNotificationDigestService from '#src/modules/user-notification/digest/notification-digest.service.ts';
import makeNotificationEmailService from '#src/modules/user-notification/email/notification-email.service.ts';
import { readUnsubscribeToken } from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';
import producerLookupDomain from '#src/modules/user-notification/core/producer-lookup.domain.ts';
import {
  describeGroupByTarget,
  mockRegisteredNotificationModule,
} from '#src/modules/user-notification/__tests__/producer.mock.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/preferences/database/notification-preference.repository.mock.ts';
import {
  fakeMarkEmailSent,
  fakeClaimDigest,
  mockUserNotificationRepository,
} from '#src/modules/user-notification/core/database/user-notification.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/preferences/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import { NotificationsAlreadySentError } from '#src/modules/user-notification/core/notification.errors.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';

function makeRecord(
  overrides: Partial<NotificationPreferenceRecord> = {},
): NotificationPreferenceRecord {
  return {
    id: 'pref-1',
    userId: 'user-1',
    category: 'comment.on_your_model',
    email: 'off',
    inApp: true,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeUserRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'recipient-1',
    name: 'Recipient',
    email: 'recipient@example.test',
    deletedAt: null,
    banned: null,
    ...overrides,
  };
}

function makeInsertedNotification(
  overrides: Partial<UserNotificationRecord> = {},
): UserNotificationRecord {
  return {
    id: 'notification-1',
    recipientId: 'recipient-1',
    eventId: 'event-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: {},
    actorId: null,
    targetType: null,
    targetId: null,
    emailSentAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as UserNotificationRecord;
}

describe('notificationDigestService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const userRepository = mockPort<UserRepository>();
  const producerLookup = producerLookupDomain({
    registeredNotificationModules: [
      mockRegisteredNotificationModule({ describeDigestItem: describeGroupByTarget }),
    ],
  });
  const mailService = { enqueue: vi.fn() };
  const mailDomain = {
    createNotificationSummaryEmail: vi.fn(),
    withOneClickUnsubscribe: makeMailDomain().withOneClickUnsubscribe,
  };
  const existingModels = new Map<string, string>();
  const getNotificationSubjectsQuery = {
    execute: vi.fn(async (notifications: ReadonlyArray<UserNotificationRecord>) => {
      return makeSubjectsByNotificationId(
        notifications.map((notification) => {
          const modelName = notification.targetId
            ? existingModels.get(notification.targetId)
            : undefined;
          const target =
            modelName === undefined
              ? null
              : {
                  name: modelName,
                  thumbnailUrl: null,
                  url: `https://example.test/models/${notification.targetId}`,
                };
          return [notification.id, { actor: null, target }] as const;
        }),
      );
    }),
  };

  const service = makeNotificationDigestService({
    notificationPreferenceRepository,
    userNotificationRepository,
    producerLookupDomain: producerLookup,
    userDomain: userDomain(),
    userRepository,
    getNotificationSubjectsQuery,
    notificationEmailService: makeNotificationEmailService({
      userNotificationRepository,
      mailService,
      mailDomain,
      transactionManager: mockTransactionManager(),
    } as never),
    mailDomain,
  } as never);

  type SentDigest = {
    to: string;
    headers?: Record<string, string>;
    items: Array<{ text: string; url: string }>;
    moreCount: number;
    feedUrl: string;
  };

  const sentIds = new Set<string>();
  const claimedDays = new Set<string>();
  let sentDigests: Array<SentDigest> = [];

  function makeNotification(
    id: string,
    category: NotificationCategory = 'comment.on_your_model',
    createdAt = new Date('2026-01-01T12:00:00Z'),
  ): UserNotificationRecord {
    return makeInsertedNotification({ id, category, createdAt });
  }

  beforeEach(() => {
    existingModels.clear();
    sentIds.clear();
    claimedDays.clear();
    userNotificationRepository.claimDigestTx
      .mockReset()
      .mockImplementation(fakeClaimDigest(claimedDays));
    sentDigests = [];
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    userNotificationRepository.markEmailSentTx
      .mockReset()
      .mockImplementation(fakeMarkEmailSent(sentIds));
    userRepository.findOneById.mockReset().mockResolvedValue(makeUserRecord());
    mailDomain.createNotificationSummaryEmail
      .mockReset()
      .mockImplementation(
        async (
          to: string,
          _name: string,
          items: SentDigest['items'],
          moreCount: number,
          feedUrl: string,
        ) => ({
          to,
          items,
          moreCount,
          feedUrl,
        }),
      );
    mailService.enqueue.mockReset().mockImplementation(async (content: SentDigest) => {
      sentDigests.push(content);
    });
  });

  async function queueDigest(
    recipientId: string,
    notifications: Array<UserNotificationRecord>,
  ): Promise<void> {
    userNotificationRepository.findPendingForRecipient.mockReset().mockResolvedValue(notifications);
    await service.queueDigestFor(
      recipientId,
      { since: new Date('2026-01-01T00:00:00Z'), until: new Date('2026-01-02T00:00:00Z') },
      ['comment.on_your_model', 'comment.reply_to_you'],
    );
  }

  describe('queueDigestFor over pending notifications', () => {
    it('emails every unsent notification once, as one summary, and marks them sent', async () => {
      const notifications = [makeNotification('a'), makeNotification('b', 'comment.reply_to_you')];

      await queueDigest('recipient-1', notifications);
      await queueDigest('recipient-1', notifications);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items.map((item) => item.text).sort()).toEqual(['a', 'b']);
      expect([...sentIds].sort()).toEqual(['a', 'b']);
    });

    it('unsubscribes from exactly the categories of the emailed notifications, for the recipient', async () => {
      const notifications = [makeNotification('a'), makeNotification('b')];

      await queueDigest('recipient-1', notifications);

      const header = sentDigests[0]!.headers?.['List-Unsubscribe'] ?? '';
      const token = new URL(header.slice(1, -1)).searchParams.get('token') ?? '';
      expect(await readUnsubscribeToken(token)).toEqual({
        userId: 'recipient-1',
        categories: ['comment.on_your_model'],
      });
      expect(sentDigests[0]!.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    });

    it('sends no email when every notification was already sent', async () => {
      const notifications = [makeNotification('a'), makeNotification('b')];
      for (const notification of notifications) sentIds.add(notification.id);

      await queueDigest('recipient-1', notifications);

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(2);
    });

    it.each([
      ['banned', { banned: true }],
      ['deleted', { deletedAt: new Date('2026-01-01') }],
      ['without an email address', { email: null }],
    ])('marks and sends nothing for a recipient who is %s', async (_label, overrides) => {
      userRepository.findOneById.mockResolvedValue(makeUserRecord(overrides));

      await queueDigest('recipient-1', [makeNotification('a')]);

      expect(sentIds.size).toBe(0);
      expect(sentDigests).toHaveLength(0);
    });

    it('marks and sends nothing for a recipient who no longer exists', async () => {
      userRepository.findOneById.mockResolvedValue(undefined);

      await queueDigest('recipient-1', [makeNotification('a')]);

      expect(sentIds.size).toBe(0);
      expect(sentDigests).toHaveLength(0);
    });

    it('caps the email at maxDigestItems lines, links the rest, and marks every notification sent', async () => {
      const cap = notificationsConfig.maxDigestItems;
      const notifications = Array.from({ length: cap + 3 }, (_, index) =>
        makeNotification(
          `notification-${index}`,
          'comment.on_your_model',
          new Date(Date.UTC(2026, 0, 1, 0, index)),
        ),
      );

      await queueDigest('recipient-1', notifications);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items).toHaveLength(cap);
      expect(sentDigests[0]!.moreCount).toBe(3);
      expect(sentDigests[0]!.feedUrl).toBe(links.notifications());
      expect(sentIds.size).toBe(cap + 3);
    });

    it('emails one line per model and marks the notifications of a deleted model sent without a line', async () => {
      existingModels.set('model-1', 'Wolf Sheep');
      const onModel = (id: string, targetId: string) =>
        makeInsertedNotification({ id, targetType: 'model', targetId, actorId: `actor-${id}` });
      const notifications = [
        onModel('a', 'model-1'),
        onModel('b', 'model-1'),
        onModel('gone', 'model-2'),
      ];

      await queueDigest('recipient-1', notifications);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items).toEqual([
        { text: '2 on Wolf Sheep', url: 'https://example.test/models/model-1' },
      ]);
      expect([...sentIds].sort()).toEqual(['a', 'b', 'gone']);
    });

    it('resolves the subjects of a digest once, as its recipient', async () => {
      getNotificationSubjectsQuery.execute.mockClear();
      userRepository.findOneById.mockResolvedValue(makeUserRecord({ id: 'recipient-7' }));
      existingModels.set('model-1', 'Wolf Sheep');
      const notifications = [
        makeInsertedNotification({ id: 'a', targetType: 'model', targetId: 'model-1' }),
        makeInsertedNotification({ id: 'b', targetType: 'model', targetId: 'model-2' }),
      ];

      await queueDigest('recipient-7', notifications);

      expect(getNotificationSubjectsQuery.execute).toHaveBeenCalledOnce();
      expect(getNotificationSubjectsQuery.execute).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'a' })]),
        'recipient-7',
      );
    });

    it('sends nothing but marks the notifications sent when no line resolves', async () => {
      const notifications = [
        makeInsertedNotification({ id: 'gone', targetType: 'model', targetId: 'model-2' }),
      ];

      await queueDigest('recipient-1', notifications);

      expect(sentDigests).toHaveLength(0);
      expect([...sentIds]).toEqual(['gone']);
    });

    it('rolls back without emailing when another path already sent one of its notifications', async () => {
      sentIds.add('done');

      await expect(
        queueDigest('recipient-1', [makeNotification('done'), makeNotification('free')]),
      ).rejects.toBeInstanceOf(NotificationsAlreadySentError);

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.has('free')).toBe(false);
    });

    it('leaves every notification unsent, and rethrows, when queueing the email fails', async () => {
      mailService.enqueue.mockRejectedValue(new Error('database unreachable'));

      await expect(
        queueDigest('recipient-1', [makeNotification('a'), makeNotification('b')]),
      ).rejects.toThrow('database unreachable');

      expect(sentIds.size).toBe(0);
    });
  });

  describe('queueDigestFor', () => {
    const window = {
      since: new Date('2026-01-01T00:00:00Z'),
      until: new Date('2026-01-02T00:00:00Z'),
    };

    beforeEach(() => {
      userNotificationRepository.findPendingForRecipient
        .mockReset()
        .mockResolvedValue([makeNotification('a')]);
      notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    });

    it('reads the pending notifications of the given categories and window without loading preferences', async () => {
      await service.queueDigestFor('recipient-1', window, ['comment.reply_to_you']);

      expect(userNotificationRepository.findPendingForRecipient).toHaveBeenCalledExactlyOnceWith(
        'recipient-1',
        ['comment.reply_to_you'],
        window.since,
        window.until,
      );
      expect(notificationPreferenceRepository.findAllByUser).not.toHaveBeenCalled();
      expect([...sentIds]).toEqual(['a']);
      expect(sentDigests).toHaveLength(1);
    });

    it('defaults to the categories the recipient has on daily', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ userId: 'recipient-1', category: 'comment.reply_to_you', email: 'daily' }),
      ]);

      await service.sendDailyDigest('recipient-1', window);

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledExactlyOnceWith(
        'recipient-1',
      );
      expect(userNotificationRepository.findPendingForRecipient).toHaveBeenCalledExactlyOnceWith(
        'recipient-1',
        ['comment.reply_to_you'],
        window.since,
        window.until,
      );
    });

    it('sends nothing when no notification is pending', async () => {
      userNotificationRepository.findPendingForRecipient.mockResolvedValue([]);

      await service.queueDigestFor('recipient-1', window, ['comment.on_your_model']);

      expect(sentDigests).toHaveLength(0);
      expect(userNotificationRepository.markEmailSentTx).not.toHaveBeenCalled();
    });

    it('reads nothing for a recipient who cannot receive email', async () => {
      userRepository.findOneById.mockResolvedValue(makeUserRecord({ banned: true }));

      await service.queueDigestFor('recipient-1', window, ['comment.on_your_model']);

      expect(userNotificationRepository.findPendingForRecipient).not.toHaveBeenCalled();
      expect(sentDigests).toHaveLength(0);
    });
  });

  describe('sendDailyDigest', () => {
    const firstWindow = {
      since: new Date('2026-01-01T17:00:00Z'),
      until: new Date('2026-01-02T16:00:00Z'),
    };
    const laterSameDayWindow = {
      since: new Date('2026-01-01T18:00:00Z'),
      until: new Date('2026-01-02T17:00:00Z'),
    };
    const nextDayWindow = {
      since: new Date('2026-01-02T17:00:00Z'),
      until: new Date('2026-01-03T16:00:00Z'),
    };

    function pending(...notifications: Array<UserNotificationRecord>) {
      userNotificationRepository.findPendingForRecipient
        .mockReset()
        .mockResolvedValue(notifications);
    }

    it('sends at most one digest per recipient per UTC day of the window end', async () => {
      pending(makeNotification('a'));
      await service.sendDailyDigest('recipient-1', firstWindow);
      pending(makeNotification('b'));
      await service.sendDailyDigest('recipient-1', laterSameDayWindow);

      expect(sentDigests).toHaveLength(1);
      expect([...sentIds]).toEqual(['a']);

      await service.sendDailyDigest('recipient-1', nextDayWindow);

      expect(sentDigests).toHaveLength(2);
      expect([...sentIds].sort()).toEqual(['a', 'b']);
    });

    it('counts each recipient separately', async () => {
      userRepository.findOneById.mockImplementation(async (id: string) => makeUserRecord({ id }));
      pending(makeNotification('a'));
      await service.sendDailyDigest('recipient-1', firstWindow);
      pending(makeNotification('b'));
      await service.sendDailyDigest('recipient-2', firstWindow);

      expect(sentDigests).toHaveLength(2);
    });

    it('leaves the day unclaimed when the digest fails, so a retry still sends', async () => {
      pending(makeNotification('a'));
      mailService.enqueue.mockRejectedValueOnce(new Error('enqueue failed'));

      await expect(service.sendDailyDigest('recipient-1', firstWindow)).rejects.toThrow(
        'enqueue failed',
      );
      await service.sendDailyDigest('recipient-1', firstWindow);

      expect(sentDigests).toHaveLength(1);
    });

    it('does not limit a digest sent for categories switched on', async () => {
      pending(makeNotification('a'));
      await service.sendDailyDigest('recipient-1', firstWindow);
      pending(makeNotification('b'));
      await service.queueDigestFor('recipient-1', firstWindow, ['comment.on_your_model']);

      expect(sentDigests).toHaveLength(2);
    });
  });

  describe('queueDigest failure while building the email', () => {
    it('leaves every notification unsent, and rethrows, when building the email throws', async () => {
      mailDomain.createNotificationSummaryEmail.mockImplementation(() => {
        throw new Error('render failed');
      });

      await expect(
        queueDigest('recipient-1', [makeNotification('a'), makeNotification('b')]),
      ).rejects.toThrow('render failed');

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(0);
    });
  });
});
