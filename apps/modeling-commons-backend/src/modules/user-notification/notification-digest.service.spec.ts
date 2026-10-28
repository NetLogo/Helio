import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import links from '#src/config/links.ts';
import notificationsConfig from '#src/config/notifications.ts';
import makeNotificationDigestService from '#src/modules/user-notification/notification-digest.service.ts';
import makeNotificationEmailService from '#src/modules/user-notification/notification-email.service.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';

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
    title: 'New comment',
    body: 'Someone commented on your model',
    url: 'https://example.test/models/model-1',
    actorUserId: null,
    targetType: null,
    targetId: null,
    emailSentAt: null,
    emailClaimedAt: null,
    readAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as UserNotificationRecord;
}

describe('notificationDigestService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const userRepository = mockUserRepository();
  const domain = userNotificationDomain();
  const mailService = { sendMailAsync: vi.fn(), sendMail: vi.fn() };
  const mailDomain = { createNotificationSummaryEmail: vi.fn() };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const existingModels = new Map<string, string>();
  const resolveNotificationSubjectsQuery = {
    execute: vi.fn(async (rows: ReadonlyArray<UserNotificationRecord>) => {
      return new Map(
        rows.map((row) => {
          const modelName = row.targetId ? existingModels.get(row.targetId) : undefined;
          const target =
            modelName === undefined
              ? null
              : {
                  name: modelName,
                  thumbnailUrl: null,
                  url: `https://example.test/models/${row.targetId}`,
                };
          return [row.id, { actor: null, target }] as const;
        }),
      );
    }),
  };

  const service = makeNotificationDigestService({
    notificationPreferenceRepository,
    userNotificationRepository,
    userNotificationDomain: domain,
    userDomain: userDomain(),
    userRepository,
    resolveNotificationSubjectsQuery,
    notificationEmailService: makeNotificationEmailService({
      userNotificationRepository,
      mailService,
      logger,
    } as never),
    mailDomain,
  } as never);

  type SentDigest = {
    to: string;
    items: Array<{ text: string; url: string }>;
    moreCount: number;
    feedUrl: string;
  };

  const claims = new Map<string, Date>();
  const sentIds = new Set<string>();
  let sentDigests: Array<SentDigest> = [];

  function makeRow(
    id: string,
    category = 'comment.on_your_model',
    createdAt = new Date('2026-01-01T12:00:00Z'),
  ): UserNotificationRecord {
    return makeInsertedNotification({ id, category, title: id, createdAt });
  }

  function isHeldClaim(id: string, claimedAt: Date): boolean {
    return claims.get(id)?.getTime() === claimedAt.getTime();
  }

  beforeEach(() => {
    existingModels.clear();
    claims.clear();
    sentIds.clear();
    sentDigests = [];
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    userNotificationRepository.claimUnsent
      .mockReset()
      .mockImplementation(async (ids: Array<string>) => {
        const emailClaimedAt = new Date();
        return ids
          .filter((id) => !claims.has(id) && !sentIds.has(id))
          .map((id) => {
            claims.set(id, emailClaimedAt);
            return { id, emailClaimedAt };
          });
      });
    userNotificationRepository.markSent
      .mockReset()
      .mockImplementation(async (ids: Array<string>, claimedAt: Date) => {
        for (const id of ids.filter((id) => isHeldClaim(id, claimedAt))) {
          claims.delete(id);
          sentIds.add(id);
        }
      });
    userNotificationRepository.releaseClaim
      .mockReset()
      .mockImplementation(async (ids: Array<string>, claimedAt: Date) => {
        for (const id of ids.filter((id) => isHeldClaim(id, claimedAt))) claims.delete(id);
      });
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
    mailService.sendMailAsync.mockReset().mockImplementation(async (content: SentDigest) => {
      sentDigests.push(content);
      return {};
    });
    logger.error.mockReset();
  });

  describe('sendDigest', () => {
    it('emails every claimed row once, as one summary, and marks them sent', async () => {
      const rows = [makeRow('a'), makeRow('b', 'comment.reply_to_you')];

      await service.sendDigest('recipient-1', rows, []);
      await service.sendDigest('recipient-1', rows, []);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items.map((item) => item.text).sort()).toEqual(['a', 'b']);
      expect([...sentIds].sort()).toEqual(['a', 'b']);
    });

    it('sends no email when the claim returns nothing', async () => {
      const rows = [makeRow('a'), makeRow('b')];
      for (const row of rows) claims.set(row.id, new Date());

      await service.sendDigest('recipient-1', rows, []);

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(0);
    });

    it.each([
      ['banned', { banned: true }],
      ['deleted', { deletedAt: new Date('2026-01-01') }],
      ['without an email address', { email: null }],
    ])('claims and sends nothing for a recipient who is %s', async (_label, overrides) => {
      userRepository.findOneById.mockResolvedValue(makeUserRecord(overrides));

      await service.sendDigest('recipient-1', [makeRow('a')], []);

      expect(claims.size).toBe(0);
      expect(sentIds.size).toBe(0);
      expect(sentDigests).toHaveLength(0);
    });

    it('claims and sends nothing for a recipient who no longer exists', async () => {
      userRepository.findOneById.mockResolvedValue(undefined);

      await service.sendDigest('recipient-1', [makeRow('a')], []);

      expect(claims.size).toBe(0);
      expect(sentDigests).toHaveLength(0);
    });

    it('caps the email at maxDigestItems lines, links the rest, and marks every claimed row sent', async () => {
      const cap = notificationsConfig.maxDigestItems;
      const rows = Array.from({ length: cap + 3 }, (_, index) =>
        makeRow(`row-${index}`, 'comment.on_your_model', new Date(Date.UTC(2026, 0, 1, 0, index))),
      );

      await service.sendDigest('recipient-1', rows, []);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items).toHaveLength(cap);
      expect(sentDigests[0]!.moreCount).toBe(3);
      expect(sentDigests[0]!.feedUrl).toBe(links.notifications());
      expect(sentIds.size).toBe(cap + 3);
      expect(claims.size).toBe(0);
    });

    it('emails one line per model and marks the rows of a deleted model sent without a line', async () => {
      existingModels.set('model-1', 'Wolf Sheep');
      const onModel = (id: string, targetId: string) =>
        makeInsertedNotification({ id, targetType: 'model', targetId, actorUserId: `actor-${id}` });
      const rows = [onModel('a', 'model-1'), onModel('b', 'model-1'), onModel('gone', 'model-2')];

      await service.sendDigest('recipient-1', rows, []);

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items).toEqual([
        { text: '2 people commented on Wolf Sheep', url: 'https://example.test/models/model-1' },
      ]);
      expect([...sentIds].sort()).toEqual(['a', 'b', 'gone']);
    });

    it('resolves the subjects of a digest once, as its recipient', async () => {
      resolveNotificationSubjectsQuery.execute.mockClear();
      userRepository.findOneById.mockResolvedValue(makeUserRecord({ id: 'recipient-7' }));
      existingModels.set('model-1', 'Wolf Sheep');
      const rows = [
        makeInsertedNotification({ id: 'a', targetType: 'model', targetId: 'model-1' }),
        makeInsertedNotification({ id: 'b', targetType: 'model', targetId: 'model-2' }),
      ];

      await service.sendDigest('recipient-7', rows, []);

      expect(resolveNotificationSubjectsQuery.execute).toHaveBeenCalledOnce();
      expect(resolveNotificationSubjectsQuery.execute).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'a' })]),
        'recipient-7',
        { includeThumbnails: false },
      );
    });

    it('sends nothing but marks the rows sent when no line resolves', async () => {
      const rows = [
        makeInsertedNotification({ id: 'gone', targetType: 'model', targetId: 'model-2' }),
      ];

      await service.sendDigest('recipient-1', rows, []);

      expect(sentDigests).toHaveLength(0);
      expect([...sentIds]).toEqual(['gone']);
      expect(claims.size).toBe(0);
    });

    it('never emails a row whose category is off in the given preferences, without loading them again', async () => {
      await service.sendDigest(
        'recipient-1',
        [makeRow('kept'), makeRow('muted', 'comment.reply_to_you')],
        [makeRecord({ userId: 'recipient-1', category: 'comment.reply_to_you', email: 'off' })],
      );

      expect(sentDigests.flatMap((digest) => digest.items.map((item) => item.text))).toEqual([
        'kept',
      ]);
      expect(sentIds.has('muted')).toBe(false);
      expect(notificationPreferenceRepository.findAllByUser).not.toHaveBeenCalled();
    });

    it('emails only the rows it claimed and leaves a row held by another claim untouched', async () => {
      const heldAt = new Date('2026-01-01T12:00:00Z');
      claims.set('held', heldAt);

      await service.sendDigest('recipient-1', [makeRow('held'), makeRow('free')], []);

      expect(sentDigests.flatMap((digest) => digest.items.map((item) => item.text))).toEqual([
        'free',
      ]);
      expect(claims.get('held')).toBe(heldAt);
      expect(sentIds.has('held')).toBe(false);
      expect(sentIds.has('free')).toBe(true);
    });

    it('leaves every row unsent and unclaimed, and rethrows, when the send fails', async () => {
      mailService.sendMailAsync.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.sendDigest('recipient-1', [makeRow('a'), makeRow('b')], []),
      ).rejects.toThrow('smtp down');

      expect(sentIds.size).toBe(0);
      expect(claims.size).toBe(0);
    });
  });

  describe('flushDigest', () => {
    it('loads the recipient preferences once and never emails a row whose category is off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ userId: 'recipient-1', category: 'comment.reply_to_you', email: 'off' }),
      ]);
      userNotificationRepository.findPendingForRecipient
        .mockReset()
        .mockResolvedValue([makeRow('kept'), makeRow('muted', 'comment.reply_to_you')]);

      await service.flushDigest('recipient-1', ['comment.on_your_model', 'comment.reply_to_you']);

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledOnce();
      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledWith('recipient-1');
      expect(sentDigests.flatMap((digest) => digest.items.map((item) => item.text))).toEqual([
        'kept',
      ]);
      expect(sentIds.has('muted')).toBe(false);
    });
  });

  describe('sendDigest failure after the claim', () => {
    it('leaves every row unsent and unclaimed, and rethrows, when building the email throws', async () => {
      mailDomain.createNotificationSummaryEmail.mockImplementation(() => {
        throw new Error('render failed');
      });

      await expect(
        service.sendDigest('recipient-1', [makeRow('a'), makeRow('b')], []),
      ).rejects.toThrow('render failed');

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(0);
      expect(claims.size).toBe(0);
    });
  });
});
