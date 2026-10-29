import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import makeUserNotificationService, {
  createUserNotificationService,
} from '#src/modules/user-notification/user-notification.service.ts';
import makeNotificationEmailService from '#src/modules/user-notification/notification-email.service.ts';
import makeNotificationDigestService from '#src/modules/user-notification/notification-digest.service.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import { NotificationNotFoundError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type {
  EmailMode,
  NotificationIntent,
  Notifier,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

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

describe('userNotificationService', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const transactionManager = mockTransactionManager();
  const domain = userNotificationDomain();

  const service = makeUserNotificationService({
    transactionManager,
    notificationPreferenceRepository,
    userNotificationDomain: domain,
    userDomain: userDomain(),
    userNotificationMapper: userNotificationMapper(),
  } as never);

  beforeEach(() => {
    notificationPreferenceRepository.findAllByUser.mockReset();
    notificationPreferenceRepository.findAllByUserTx.mockReset();
    notificationPreferenceRepository.upsertTx.mockReset();
  });

  describe('updatePreferences', () => {
    it('keeps the currently-resolved value for an omitted channel', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([
        makeRecord({ email: 'off', inApp: true }),
      ]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', inApp: false },
      ]);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: 'off',
          inApp: false,
        }),
      );
    });

    it('falls back to the catalog default for an omitted channel with no override', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', email: 'off' },
      ]);

      const defaults = domain.categories.find(
        (info) => info.category === 'comment.on_your_model',
      )!.defaults;

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: 'off',
          inApp: defaults.inApp,
        }),
      );
    });

    it('writes with the userId that was passed in, not any value from the input rows', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([]);

      await service.updatePreferences('caller-user', [
        { category: 'comment.on_your_model', email: 'immediate', inApp: true },
      ]);

      expect(notificationPreferenceRepository.findAllByUserTx).toHaveBeenCalledWith(
        expect.anything(),
        'caller-user',
      );
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'caller-user' }),
      );
    });
  });
  describe('getPreferences', () => {
    function expectedDefaults() {
      return domain.categories.map((info) => ({
        category: info.category,
        label: info.label,
        description: info.description,
        email: info.defaults.email,
        inApp: info.defaults.inApp,
      }));
    }

    it('returns every catalog category at its defaults when the user has no overrides', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      const result = await service.getPreferences('user-1');

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ categories: expectedDefaults() });
    });

    it('applies a stored override to its category and leaves the rest at defaults', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.reply_to_you', email: 'off', inApp: true }),
      ]);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({
        categories: expectedDefaults().map((preference) =>
          preference.category === 'comment.reply_to_you'
            ? { ...preference, email: 'off', inApp: true }
            : preference,
        ),
      });
    });

    it('ignores an override row for a category missing from the catalog', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.mentions_you', email: 'off', inApp: false }),
      ]);

      const result = await service.getPreferences('user-1');

      expect(result).toEqual({ categories: expectedDefaults() });
    });
  });
});

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'event-1',
    type: 'model_comment.created',
    actorId: 'actor-1',
    resourceType: 'model',
    resourceId: 'model-1',
    payload: {},
    createdAt: new Date('2026-01-01'),
    processedAt: null,
    attempts: 0,
    lastError: null,
    ...overrides,
  };
}

function makeIntent(overrides: Partial<NotificationIntent> = {}): NotificationIntent {
  return {
    recipientUserId: 'recipient-1',
    category: 'comment.on_your_model',
    title: 'New comment',
    body: 'Someone commented on your model',
    url: 'https://example.test/models/model-1',
    buildEmail: vi.fn().mockResolvedValue({ to: 'recipient@example.test', subject: 'New comment' }),
    ...overrides,
  };
}

function makeNotifier(intents: Array<NotificationIntent>): Notifier {
  return {
    eventTypes: ['model_comment.created'],
    resolve: vi.fn().mockResolvedValue(intents),
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

describe('userNotificationService handleEvent', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const userRepository = mockUserRepository();
  const transactionManager = mockTransactionManager();
  const domain = userNotificationDomain();
  const mailService = { sendMailAsync: vi.fn(), sendMail: vi.fn() };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };

  function build(notifiers: Array<Notifier>) {
    return createUserNotificationService(notifiers, {
      transactionManager,
      notificationPreferenceRepository,
      userNotificationRepository,
      userNotificationDomain: domain,
      userDomain: userDomain(),
      userNotificationMapper: userNotificationMapper(),
      userRepository,
      notificationEmailService: makeNotificationEmailService({
        userNotificationRepository,
        mailService,
        logger,
      } as never),
      logger,
    } as never);
  }

  const claims = new Map<string, Date>();
  const sentIds = new Set<string>();

  function isHeldClaim(id: string, claimedAt: Date): boolean {
    return claims.get(id)?.getTime() === claimedAt.getTime();
  }

  beforeEach(() => {
    claims.clear();
    sentIds.clear();
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    userNotificationRepository.insertTx.mockReset().mockResolvedValue(makeInsertedNotification());
    userNotificationRepository.findOneByDeliveryKey.mockReset().mockResolvedValue(undefined);
    userNotificationRepository.claimUnsent
      .mockReset()
      .mockImplementation(async (ids: Array<string>) =>
        ids
          .filter((id) => !claims.has(id) && !sentIds.has(id))
          .map((id) => {
            const emailClaimedAt = new Date();
            claims.set(id, emailClaimedAt);
            return { id, emailClaimedAt };
          }),
      );
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
    mailService.sendMailAsync.mockReset().mockResolvedValue({});
    logger.error.mockReset();
  });

  describe('handleEvent', () => {
    it('is a no-op when no notifier handles the event type', async () => {
      const notifier = makeNotifier([makeIntent()]);
      const service = build([notifier]);

      await service.handleEvent(makeEvent({ type: 'model.deleted' }));

      expect(notifier.resolve).not.toHaveBeenCalled();
      expect(userRepository.findOneById).not.toHaveBeenCalled();
    });

    it("still delivers a healthy notifier's intents when another notifier throws, then rethrows", async () => {
      const healthy = makeNotifier([makeIntent()]);
      const broken = makeNotifier([]);
      (broken.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('notifier down'));
      const service = build([broken, healthy]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it('inserts a ledger row and sends mail for a fully opted-in recipient', async () => {
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          recipientId: 'recipient-1',
          eventId: 'event-1',
          category: 'comment.on_your_model',
        }),
      );
      expect(intent.buildEmail).toHaveBeenCalledWith(
        { id: 'recipient-1', email: 'recipient@example.test', name: 'Recipient' },
        expect.objectContaining({
          unsubscribeUrl: expect.stringMatching(/^mailto:/),
          preferencesUrl: expect.stringContaining('/settings/notifications'),
        }),
      );
      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('stores the references an intent carries, not resolved urls', async () => {
      const intent = makeIntent({
        actorUserId: 'commenter-1',
        target: { type: 'model', id: 'model-1' },
      });
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorUserId: 'commenter-1',
          targetType: 'model',
          targetId: 'model-1',
        }),
      );
    });

    it('writes null columns for an intent that references neither', async () => {
      const service = build([makeNotifier([makeIntent()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ actorUserId: null, targetType: null, targetId: null }),
      );
    });

    it('stores a target reference for an intent with no actor', async () => {
      const intent = makeIntent({ target: { type: 'model', id: 'model-1' } });
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ actorUserId: null, targetType: 'model', targetId: 'model-1' }),
      );
    });

    it('sends no mail and writes no ledger row for a recipient fully opted out of the category', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: false }),
      ]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('records an immediate row and sends it right away when email is immediate', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: true }),
      ]);
      const service = build([makeNotifier([makeIntent()])]);

      await service.handleEvent(makeEvent());

      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('records a daily row and leaves it unsent when email is daily', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'daily', inApp: true }),
      ]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
    });

    it('records a row and sends nothing when email is off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalled();
      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('still writes the ledger row when only the in-app channel is off, so a retry cannot resend', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: false }),
      ]);
      const service = build([makeNotifier([makeIntent()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledTimes(1);
      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it.each([
      ['a missing recipient', undefined],
      ['a soft-deleted recipient', makeUserRecord({ deletedAt: new Date('2026-01-02') })],
      ['a banned recipient', makeUserRecord({ banned: true })],
      ['a recipient without an email', makeUserRecord({ email: null })],
    ])('skips %s without writing a ledger row or invoking buildEmail', async (_label, record) => {
      userRepository.findOneById.mockResolvedValue(record);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('skips without mailing when a retry finds a ledger row it cannot claim', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      userNotificationRepository.findOneByDeliveryKey.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: new Date('2026-01-02') }),
      );
      userNotificationRepository.claimUnsent.mockResolvedValue([]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(userNotificationRepository.findOneByDeliveryKey).toHaveBeenCalledWith(
        'event-1',
        'recipient-1',
        'comment.on_your_model',
      );
      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('sends nothing when the row is already claimed by a live attempt', async () => {
      claims.set('notification-1', new Date());
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
    });

    it('resumes and mails when a retry finds a ledger row whose email was never sent', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      userNotificationRepository.findOneByDeliveryKey.mockResolvedValue(
        makeInsertedNotification({ id: 'existing-1', emailSentAt: null }),
      );
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(intent.buildEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['existing-1']));
    });

    it('does not read the ledger back when the insert wrote a fresh row', async () => {
      const service = build([makeNotifier([makeIntent()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.findOneByDeliveryKey).not.toHaveBeenCalled();
    });

    it('skips without mailing when the email channel is off and the ledger row already exists', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      userNotificationRepository.findOneByDeliveryKey.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: null }),
      );
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('leaves the row unsent and unclaimed, logs, and rethrows when sendMailAsync rejects', async () => {
      const smtpError = new Error('SMTP unreachable');
      mailService.sendMailAsync.mockRejectedValue(smtpError);
      const service = build([makeNotifier([makeIntent()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(AggregateError);
      expect((rejection as AggregateError).errors).toEqual([smtpError]);
      expect(sentIds.size).toBe(0);
      expect(claims.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: smtpError }));
    });

    it('logs and resolves when the email is sent but marking it as sent fails', async () => {
      const dbError = new Error('database unreachable');
      userNotificationRepository.markSent.mockRejectedValue(dbError);
      const service = build([makeNotifier([makeIntent()])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: dbError }));
      expect(claims.size).toBe(1);
    });

    it('releases the claim on a failed send so the retry sends exactly once', async () => {
      const service = build([makeNotifier([makeIntent()])]);
      mailService.sendMailAsync.mockRejectedValueOnce(new Error('SMTP unreachable'));

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      userNotificationRepository.findOneByDeliveryKey.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: null }),
      );
      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();
      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(2);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it.each([
      ['findOneById', () => userRepository.findOneById],
      ['findAllByUser', () => notificationPreferenceRepository.findAllByUser],
      ['insertTx', () => userNotificationRepository.insertTx],
    ])('rethrows when %s fails and sends no mail', async (_label, getMock) => {
      const dbError = new Error('connection reset');
      getMock().mockRejectedValue(dbError);
      const service = build([makeNotifier([makeIntent()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([dbError]);
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('delivers every intent when one fails, then skips the delivered one on retry', async () => {
      userRepository.findOneById.mockImplementation(async (id: string) =>
        makeUserRecord({ id, email: `${id}@example.test` }),
      );
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, params: { recipientId: string }) =>
          makeInsertedNotification({
            id: `row-${params.recipientId}`,
            recipientId: params.recipientId,
          }),
      );
      const failingError = new Error('SMTP rejected b');
      mailService.sendMailAsync.mockImplementation(async (content: { to: string }) => {
        if (content.to === 'b@example.test') throw failingError;
        return {};
      });
      const intentA = makeIntent({
        recipientUserId: 'a',
        buildEmail: vi.fn().mockResolvedValue({ to: 'a@example.test', subject: 'A' }),
      });
      const intentB = makeIntent({
        recipientUserId: 'b',
        buildEmail: vi.fn().mockResolvedValue({ to: 'b@example.test', subject: 'B' }),
      });
      const service = build([makeNotifier([intentA, intentB])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([failingError]);
      expect(sentIds).toEqual(new Set(['row-a']));

      mailService.sendMailAsync.mockReset().mockResolvedValue({});
      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      userNotificationRepository.findOneByDeliveryKey.mockImplementation(
        async (_eventId: string, recipientId: string) =>
          makeInsertedNotification({
            id: `row-${recipientId}`,
            recipientId,
            emailSentAt: recipientId === 'a' ? new Date('2026-01-02') : null,
          }),
      );

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.sendMailAsync).toHaveBeenCalledTimes(1);
      expect(mailService.sendMailAsync).toHaveBeenCalledWith({
        to: 'b@example.test',
        subject: 'B',
      });
      expect(sentIds).toEqual(new Set(['row-a', 'row-b']));
    });

    it('rethrows resolution and delivery failures together after every intent is attempted', async () => {
      const resolveError = new Error('notifier down');
      const smtpError = new Error('SMTP unreachable');
      const broken = makeNotifier([]);
      (broken.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(resolveError);
      mailService.sendMailAsync.mockRejectedValue(smtpError);
      const service = build([broken, makeNotifier([makeIntent()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([resolveError, smtpError]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('applies preferences and recipient checks independently per intent', async () => {
      notificationPreferenceRepository.findAllByUser.mockImplementation(async (userId: string) =>
        userId === 'blocked-recipient'
          ? [makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: false })]
          : [],
      );
      userRepository.findOneById.mockImplementation(async (id: string) =>
        makeUserRecord({ id, email: `${id}@example.test` }),
      );
      const allowedIntent = makeIntent({ recipientUserId: 'allowed-recipient' });
      const blockedIntent = makeIntent({ recipientUserId: 'blocked-recipient' });
      const service = build([makeNotifier([allowedIntent, blockedIntent])]);

      await service.handleEvent(makeEvent());

      expect(allowedIntent.buildEmail).toHaveBeenCalledTimes(1);
      expect(blockedIntent.buildEmail).not.toHaveBeenCalled();
    });
  });
});

describe('userNotificationService markRead', () => {
  const userNotificationRepository = mockUserNotificationRepository();
  const domain = userNotificationDomain();

  const service = makeUserNotificationService({
    userNotificationRepository,
    userNotificationDomain: domain,
    userDomain: userDomain(),
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stamps readAt on a notification the caller owns', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(makeInsertedNotification());

    await service.markRead('recipient-1', 'notification-1');

    expect(userNotificationRepository.markRead).toHaveBeenCalledWith(
      'notification-1',
      expect.any(Date),
    );
  });

  it('leaves an already-read notification untouched', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(
      makeInsertedNotification({ readAt: new Date('2026-01-02') }),
    );

    await service.markRead('recipient-1', 'notification-1');

    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });

  it('rejects a notification that does not exist', async () => {
    userNotificationRepository.findOneById.mockResolvedValue(undefined);

    await expect(service.markRead('recipient-1', 'missing')).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });

  it("refuses to read another user's notification and does not leak that it exists", async () => {
    userNotificationRepository.findOneById.mockResolvedValue(makeInsertedNotification());

    await expect(service.markRead('someone-else', 'notification-1')).rejects.toThrow(
      NotificationNotFoundError,
    );
    expect(userNotificationRepository.markRead).not.toHaveBeenCalled();
  });
});

describe('userNotificationService digest', () => {
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

  const notificationDigestService = makeNotificationDigestService({
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

  const service = createUserNotificationService([], {
    transactionManager: mockTransactionManager(),
    notificationPreferenceRepository,
    userNotificationRepository,
    userNotificationDomain: domain,
    userDomain: userDomain(),
    userNotificationMapper: userNotificationMapper(),
    userRepository,
    notificationDigestService,
    logger,
  } as never);

  type SentDigest = {
    to: string;
    items: Array<{ text: string; url: string }>;
    moreCount: number;
    feedUrl: string;
  };

  const claims = new Map<string, Date>();
  const sentIds = new Set<string>();
  let pendingRows: Array<UserNotificationRecord> = [];
  let sentDigests: Array<SentDigest> = [];

  function makeRow(
    id: string,
    category = 'comment.on_your_model',
    createdAt = new Date('2026-01-01T12:00:00Z'),
  ): UserNotificationRecord {
    return makeInsertedNotification({ id, category, title: id, createdAt });
  }

  function makeRecentRow(id: string, ageMs: number, category = 'comment.on_your_model') {
    return makeRow(id, category, new Date(Date.now() - ageMs));
  }

  function isHeldClaim(id: string, claimedAt: Date): boolean {
    return claims.get(id)?.getTime() === claimedAt.getTime();
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    existingModels.clear();
    claims.clear();
    sentIds.clear();
    pendingRows = [];
    sentDigests = [];
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    notificationPreferenceRepository.findAllByUserTx.mockReset().mockResolvedValue([]);
    notificationPreferenceRepository.upsertTx.mockReset().mockResolvedValue(undefined);
    userNotificationRepository.findPendingForRecipient
      .mockReset()
      .mockImplementation(
        async (_recipientId: string, categories: Array<string>, since: Date, until: Date) =>
          pendingRows.filter(
            (row) =>
              categories.includes(row.category) &&
              !sentIds.has(row.id) &&
              row.createdAt >= since &&
              row.createdAt <= until,
          ),
      );
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

  describe('updatePreferences flush', () => {
    const recentMs = MINUTE_MS;

    function storeModes(email: EmailMode, ...categories: Array<string>) {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue(
        categories.map((category) => makeRecord({ userId: 'recipient-1', category, email })),
      );
    }

    function storeDaily(...categories: Array<string>) {
      storeModes('daily', ...categories);
    }

    it('sends one email covering the pending rows of every category switched to immediate', async () => {
      storeDaily('comment.on_your_model', 'comment.reply_to_you');
      pendingRows = [
        makeRecentRow('a', recentMs),
        makeRecentRow('b', recentMs, 'comment.reply_to_you'),
      ];

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
        { category: 'comment.reply_to_you', email: 'immediate' },
      ]);
      await vi.waitFor(() => expect(sentIds.size).toBe(2));
      await settle();

      expect(sentDigests).toHaveLength(1);
      expect(sentDigests[0]!.items.map((item) => item.text).sort()).toEqual(['a', 'b']);
    });

    it.each<[EmailMode, EmailMode]>([
      ['off', 'immediate'],
      ['off', 'daily'],
      ['immediate', 'daily'],
      ['daily', 'immediate'],
    ])(
      'flushes rows younger than the digest minimum age when switching %s to %s',
      async (from, to) => {
        storeModes(from, 'comment.on_your_model');
        notificationPreferenceRepository.findAllByUser.mockResolvedValue([
          makeRecord({ userId: 'recipient-1', category: 'comment.on_your_model', email: to }),
        ]);
        pendingRows = [makeRecentRow('fresh', 0)];

        await service.updatePreferences('recipient-1', [
          { category: 'comment.on_your_model', email: to },
        ]);
        await vi.waitFor(() => expect(sentIds.has('fresh')).toBe(true));
        await settle();

        expect(sentDigests).toHaveLength(1);
      },
    );

    it('flushes a category with no stored override when it is switched to daily', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([]);
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ userId: 'recipient-1', category: 'comment.on_your_model', email: 'daily' }),
      ]);
      pendingRows = [makeRecentRow('a', recentMs)];

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'daily' },
      ]);
      await vi.waitFor(() => expect(sentIds.has('a')).toBe(true));
      await settle();

      expect(sentDigests).toHaveLength(1);
    });

    it('never flushes a row older than the 25 hour window', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [
        makeRecentRow('recent', recentMs),
        makeRecentRow('old', notificationsConfig.windowMs + recentMs),
      ];

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
      ]);
      await vi.waitFor(() => expect(sentIds.has('recent')).toBe(true));
      await settle();

      expect(sentIds.has('old')).toBe(false);
      expect(sentDigests[0]!.items.map((item) => item.text)).toEqual(['recent']);
    });

    it.each<[EmailMode, EmailMode]>([
      ['daily', 'off'],
      ['immediate', 'off'],
      ['daily', 'daily'],
      ['immediate', 'immediate'],
    ])('sends nothing when %s is saved as %s', async (from, to) => {
      storeModes(from, 'comment.on_your_model');
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ userId: 'recipient-1', category: 'comment.on_your_model', email: to }),
      ]);
      pendingRows = [makeRecentRow('a', recentMs)];

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: to },
      ]);
      await settle();

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(0);
    });

    it('sends nothing for an in-app only toggle', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [makeRecentRow('a', recentMs)];

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', inApp: false },
      ]);
      await settle();

      expect(sentDigests).toHaveLength(0);
      expect(sentIds.size).toBe(0);
    });

    it('resolves before the flush email has been sent', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [makeRecentRow('a', recentMs)];
      let finishSend: () => void = () => undefined;
      mailService.sendMailAsync.mockImplementation(
        async () =>
          new Promise<void>((resolve) => {
            finishSend = resolve;
          }),
      );

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
      ]);

      expect(sentIds.size).toBe(0);
      await vi.waitFor(() => expect(mailService.sendMailAsync).toHaveBeenCalled());
      finishSend();
      await vi.waitFor(() => expect(sentIds.has('a')).toBe(true));
    });

    it('logs a failed flush and still resolves, leaving the rows sendable', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [makeRecentRow('a', recentMs)];
      mailService.sendMailAsync.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.updatePreferences('recipient-1', [
          { category: 'comment.on_your_model', email: 'immediate' },
        ]),
      ).resolves.toBeUndefined();
      await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());

      expect(sentIds.size).toBe(0);
      expect(claims.size).toBe(0);
    });
  });
});
