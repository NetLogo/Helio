import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeUserNotificationService, {
  createUserNotificationService,
} from '#src/modules/user-notification/user-notification.service.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import { UnknownCategoryError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import { mockUserNotificationRepository } from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type {
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
    email: false,
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
  } as never);

  beforeEach(() => {
    notificationPreferenceRepository.findAllByUser.mockReset();
    notificationPreferenceRepository.upsertTx.mockReset();
  });

  describe('updatePreferences', () => {
    it('rejects an unknown category and writes nothing', async () => {
      await expect(
        service.updatePreferences('user-1', [{ category: 'comment.mentions_you', email: false }]),
      ).rejects.toThrow(UnknownCategoryError);

      expect(notificationPreferenceRepository.findAllByUser).not.toHaveBeenCalled();
      expect(notificationPreferenceRepository.upsertTx).not.toHaveBeenCalled();
    });

    it('keeps the currently-resolved value for an omitted channel', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ email: false, inApp: true }),
      ]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', inApp: false },
      ]);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: false,
          inApp: false,
        }),
      );
    });

    it('falls back to the catalog default for an omitted channel with no override', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      await service.updatePreferences('user-1', [
        { category: 'comment.on_your_model', email: false },
      ]);

      const defaults = domain.categories.find(
        (info) => info.category === 'comment.on_your_model',
      )!.defaults;

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          category: 'comment.on_your_model',
          email: false,
          inApp: defaults.inApp,
        }),
      );
    });

    it('writes with the userId that was passed in, not any value from the input rows', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([]);

      await service.updatePreferences('caller-user', [
        { category: 'comment.on_your_model', email: true, inApp: true },
      ]);

      expect(notificationPreferenceRepository.findAllByUser).toHaveBeenCalledWith('caller-user');
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'caller-user' }),
      );
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
    emailSentAt: null,
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
      userRepository,
      mailService,
      logger,
    } as never);
  }

  beforeEach(() => {
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    userNotificationRepository.insertTx.mockReset().mockResolvedValue(makeInsertedNotification());
    userNotificationRepository.markEmailSent.mockReset();
    userRepository.findOneById.mockReset().mockResolvedValue(makeUserRecord());
    mailService.sendMailAsync.mockReset().mockResolvedValue({});
    logger.error.mockReset();
  });

  describe('handles', () => {
    it('is true only for event types a registered notifier declares', () => {
      const service = build([makeNotifier([])]);

      expect(service.handles('model_comment.created')).toBe(true);
      expect(service.handles('model.deleted')).toBe(false);
    });

    it('is always false with no notifiers registered', () => {
      const service = build([]);

      expect(service.handles('model_comment.created')).toBe(false);
    });
  });

  describe('handleEvent', () => {
    it('is a no-op when no notifier handles the event type', async () => {
      const notifier = makeNotifier([makeIntent()]);
      const service = build([notifier]);

      await service.handleEvent(makeEvent({ type: 'model.deleted' }));

      expect(notifier.resolve).not.toHaveBeenCalled();
      expect(userRepository.findOneById).not.toHaveBeenCalled();
    });

    it('still delivers a healthy notifier\'s intents when another notifier throws, then rethrows', async () => {
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
      expect(userNotificationRepository.markEmailSent).toHaveBeenCalledWith(
        'notification-1',
        expect.any(Date),
      );
    });

    it('sends no mail and writes no ledger row for a recipient fully opted out of the category', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: false, inApp: false }),
      ]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('sends no mail when the recipient turned the email channel off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: false, inApp: true }),
      ]);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await service.handleEvent(makeEvent());

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
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

      await service.handleEvent(makeEvent());

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('sends no mail and does not throw when the ledger row already exists', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(undefined);
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(intent.buildEmail).not.toHaveBeenCalled();
      expect(mailService.sendMailAsync).not.toHaveBeenCalled();
    });

    it('leaves emailSentAt unset, logs, and does not throw when sendMailAsync rejects', async () => {
      mailService.sendMailAsync.mockRejectedValue(new Error('SMTP unreachable'));
      const intent = makeIntent();
      const service = build([makeNotifier([intent])]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(userNotificationRepository.markEmailSent).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
      );
    });

    it('applies preferences and recipient checks independently per intent', async () => {
      notificationPreferenceRepository.findAllByUser.mockImplementation(async (userId: string) =>
        userId === 'blocked-recipient'
          ? [makeRecord({ category: 'comment.on_your_model', email: false, inApp: false })]
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
