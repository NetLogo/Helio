import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import notificationsConfig from '#src/config/notifications.ts';
import makeUserNotificationService, {
  createUserNotificationService,
} from '#src/modules/user-notification/user-notification.service.ts';
import makeNotificationEmailService from '#src/modules/user-notification/notification-email.service.ts';
import makeNotificationDigestService from '#src/modules/user-notification/notification-digest.service.ts';
import userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import {
  describeGroupByTarget,
  mockNotificationProducer,
} from '#src/modules/user-notification/domain/notification-producer.mock.ts';
import makeMailDomain from '#src/modules/mail/domain/mail.domain.ts';
import { notificationCategoryCatalog } from '#src/modules/notification-producers.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import {
  InvalidUnsubscribeTokenError,
  NotificationNotFoundError,
} from '#src/modules/user-notification/domain/user-notification.errors.ts';
import { mockNotificationPreferenceRepository } from '#src/modules/user-notification/database/notification-preference.repository.mock.ts';
import {
  fakeMarkEmailSent,
  mockUserNotificationRepository,
} from '#src/modules/user-notification/database/user-notification.repository.mock.ts';
import { mockUserRepository } from '#src/modules/user/database/user.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { MINUTE_MS } from '#src/shared/utils/consts.ts';
import type { NotificationPreferenceRecord } from '#src/modules/user-notification/database/notification-preference.record.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type {
  EmailMode,
  NotificationPreviews,
  NotificationProducer,
  NotificationRecipient,
  NotificationRowFacts,
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
  const domain = userNotificationDomain({ notificationProducers: [mockNotificationProducer()] });

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

  describe('unsubscribe', () => {
    function readToken(url: string): string {
      return new URL(url).searchParams.get('token') ?? '';
    }

    it('turns email off for exactly the signed categories of the signed user', async () => {
      notificationPreferenceRepository.findAllByUserTx.mockResolvedValue([
        makeRecord({ userId: 'user-1', category: 'comment.on_your_model', inApp: false }),
      ]);
      const token = readToken(
        domain.getEmailLinks('user-1', ['comment.on_your_model']).unsubscribeUrl,
      );

      await service.unsubscribe(token);

      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledTimes(1);
      expect(notificationPreferenceRepository.upsertTx).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        category: 'comment.on_your_model',
        email: 'off',
        inApp: false,
      });
    });

    it('refuses a tampered token and writes nothing', async () => {
      const token = readToken(
        domain.getEmailLinks('user-1', ['comment.on_your_model']).unsubscribeUrl,
      );
      const [payload] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({ u: 'user-2', c: ['comment.on_your_model'] }),
      ).toString('base64url');

      await expect(service.unsubscribe(token.replace(payload!, forged))).rejects.toBeInstanceOf(
        InvalidUnsubscribeTokenError,
      );
      await expect(service.unsubscribe('not-a-token')).rejects.toBeInstanceOf(
        InvalidUnsubscribeTokenError,
      );
      expect(notificationPreferenceRepository.upsertTx).not.toHaveBeenCalled();
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
    ...overrides,
  };
}

function makeRowFacts(overrides: Partial<NotificationRowFacts> = {}): NotificationRowFacts {
  return {
    recipientUserId: 'recipient-1',
    category: 'comment.on_your_model',
    url: 'https://example.test/models/model-1',
    payload: {},
    ...overrides,
  };
}

function makeProducer(rowFacts: Array<NotificationRowFacts>): NotificationProducer {
  return mockNotificationProducer({
    resolve: vi.fn().mockResolvedValue(rowFacts),
    renderEmail: vi.fn().mockImplementation(async (_row, recipient: NotificationRecipient) => ({
      to: recipient.email,
      subject: 'New comment',
    })),
  });
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
    actorUserId: null,
    targetType: null,
    targetId: null,
    emailSentAt: null,
    readAt: null,
    inAppSuppressed: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as UserNotificationRecord;
}

describe('userNotificationService handleEvent', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const userRepository = mockUserRepository();
  const transactionManager = mockTransactionManager();
  const domain = userNotificationDomain({ notificationProducers: [mockNotificationProducer()] });
  const mailService = { enqueue: vi.fn() };
  const jobQueue = { publish: vi.fn() };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const getNotificationPreviewsQuery = { execute: vi.fn() };
  const recipientPreview: NotificationPreviews = {
    actor: { name: 'Alicia', thumbnailUrl: null, url: 'https://example.test/users/alice' },
    target: { name: null, thumbnailUrl: null, url: 'https://example.test/models/model-1' },
  };

  function build(producers: Array<NotificationProducer>) {
    return createUserNotificationService(producers, {
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
        transactionManager,
      } as never),
      getNotificationPreviewsQuery,
      mailDomain: makeMailDomain(),
      jobQueue,
      logger,
    } as never);
  }

  const sentIds = new Set<string>();

  beforeEach(() => {
    sentIds.clear();
    notificationPreferenceRepository.findAllByUser.mockReset().mockResolvedValue([]);
    userNotificationRepository.insertTx.mockReset().mockResolvedValue(makeInsertedNotification());
    userNotificationRepository.markEmailSentTx
      .mockReset()
      .mockImplementation(fakeMarkEmailSent(sentIds));
    userRepository.findOneById.mockReset().mockResolvedValue(makeUserRecord());
    mailService.enqueue.mockReset().mockResolvedValue(undefined);
    jobQueue.publish.mockReset().mockResolvedValue(['job-1']);
    logger.error.mockReset();
    getNotificationPreviewsQuery.execute
      .mockReset()
      .mockImplementation(
        async (rows: Array<{ id: string }>) =>
          new Map(rows.map((row) => [row.id, recipientPreview])),
      );
  });

  describe('handleEvent', () => {
    it('is a no-op when no notifier handles the event type', async () => {
      const notifier = makeProducer([makeRowFacts()]);
      const service = build([notifier]);

      await service.handleEvent(makeEvent({ type: 'model.deleted' }));

      expect(notifier.resolve).not.toHaveBeenCalled();
      expect(userRepository.findOneById).not.toHaveBeenCalled();
    });

    it("still delivers a healthy notifier's intents when another notifier throws, then rethrows", async () => {
      const healthy = makeProducer([makeRowFacts()]);
      const broken = makeProducer([]);
      (broken.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('notifier down'));
      const service = build([broken, healthy]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it("redacts the producer's own rows with the redaction it derives from the event", async () => {
      userNotificationRepository.redactPayloads.mockReset().mockResolvedValue(2);
      const redaction = { match: { key: 'commentId', value: 'comment-1' }, fields: ['excerpt'] };
      const producer = mockNotificationProducer({
        categories: { 'comment.reply_to_you': notificationCategoryCatalog['comment.reply_to_you'] },
        redact: vi.fn().mockReturnValue(redaction),
      });
      const service = build([producer]);
      const event = makeEvent({ type: 'model_comment.created' });

      await service.handleEvent(event);

      expect(producer.redact).toHaveBeenCalledWith(event);
      expect(userNotificationRepository.redactPayloads).toHaveBeenCalledExactlyOnceWith(
        ['comment.reply_to_you'],
        redaction,
      );
    });

    it('redacts nothing when the producer derives no redaction from the event', async () => {
      userNotificationRepository.redactPayloads.mockReset();
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.redactPayloads).not.toHaveBeenCalled();
    });

    it('rethrows a failed redaction so the event is retried', async () => {
      userNotificationRepository.redactPayloads.mockReset().mockRejectedValue(new Error('db down'));
      const producer = mockNotificationProducer({
        redact: vi
          .fn()
          .mockReturnValue({ match: { key: 'commentId', value: 'c' }, fields: ['excerpt'] }),
      });
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);
    });

    it('inserts a ledger row and sends mail for a fully opted-in recipient', async () => {
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          recipientId: 'recipient-1',
          eventId: 'event-1',
          category: 'comment.on_your_model',
        }),
      );
      expect(producer.renderEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'notification-1' }),
        { id: 'recipient-1', email: 'recipient@example.test', name: 'Recipient' },
        recipientPreview,
        expect.objectContaining({
          preferencesUrl: expect.stringContaining('/settings/notifications'),
        }),
      );
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it("links the email to an unsubscribe for the recipient and the row's category only", async () => {
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      const [, , , emailLinks] = vi.mocked(producer.renderEmail).mock.calls[0]!;
      const pageToken = new URL(emailLinks.unsubscribeUrl).searchParams.get('token') ?? '';
      expect(domain.readUnsubscribeToken(pageToken)).toEqual({
        userId: 'recipient-1',
        categories: ['comment.on_your_model'],
      });

      const [content] = mailService.enqueue.mock.calls[0]!;
      expect(content.headers).toEqual({
        'List-Unsubscribe': `<${emailLinks.oneClickUnsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      });
      const oneClickToken =
        new URL(emailLinks.oneClickUnsubscribeUrl).searchParams.get('token') ?? '';
      expect(domain.readUnsubscribeToken(oneClickToken)).toEqual({
        userId: 'recipient-1',
        categories: ['comment.on_your_model'],
      });
    });

    it("renders the email from the ledger row and the recipient's preview", async () => {
      const ledger = makeInsertedNotification({
        actorUserId: 'commenter-1',
        targetType: 'model',
        targetId: 'model-1',
      });
      userNotificationRepository.insertTx.mockResolvedValue(ledger);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(getNotificationPreviewsQuery.execute).toHaveBeenCalledWith([ledger], 'recipient-1');
      expect(producer.renderEmail).toHaveBeenCalledWith(
        ledger,
        expect.objectContaining({ id: 'recipient-1' }),
        recipientPreview,
        expect.anything(),
      );
    });

    it('fails the delivery, leaves the row unsent and rethrows when the preview lookup rejects', async () => {
      const lookupError = new Error('previews unavailable');
      getNotificationPreviewsQuery.execute.mockRejectedValue(lookupError);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([lookupError]);
      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: lookupError }));
    });

    it('stores the references an intent carries, not resolved urls', async () => {
      const producer = makeProducer([
        makeRowFacts({
          actorUserId: 'commenter-1',
          target: { type: 'model', id: 'model-1' },
        }),
      ]);
      const service = build([producer]);

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
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ actorUserId: null, targetType: null, targetId: null }),
      );
    });

    it('stores a target reference for an intent with no actor', async () => {
      const producer = makeProducer([makeRowFacts({ target: { type: 'model', id: 'model-1' } })]);
      const service = build([producer]);

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
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('records an immediate row and sends it right away when email is immediate', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: true }),
      ]);
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('records a daily row and leaves it unsent when email is daily', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'daily', inApp: true }),
      ]);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
    });

    it('records a row and sends nothing when email is off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalled();
      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('still writes the ledger row when only the in-app channel is off, so a retry cannot resend', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: false }),
      ]);
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledTimes(1);
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('stamps the row as suppressed in-app when the in-app channel is off at delivery', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: false }),
      ]);
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inAppSuppressed: true }),
      );
    });

    it('leaves the row visible in-app when the in-app channel is on at delivery', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: true }),
      ]);
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inAppSuppressed: false }),
      );
    });

    it.each([
      ['a missing recipient', undefined],
      ['a soft-deleted recipient', makeUserRecord({ deletedAt: new Date('2026-01-02') })],
      ['a banned recipient', makeUserRecord({ banned: true })],
      ['a recipient without an email', makeUserRecord({ email: null })],
    ])('skips %s without writing a ledger row or rendering an email', async (_label, record) => {
      userRepository.findOneById.mockResolvedValue(record);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('skips without mailing when a retry finds a ledger row already marked sent', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: new Date('2026-01-02') }),
      );
      userNotificationRepository.markEmailSentTx.mockResolvedValue([]);
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('queues nothing when another path already marked the row sent', async () => {
      sentIds.add('notification-1');
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('resumes and mails when a retry finds a ledger row whose email was never sent', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ id: 'existing-1', emailSentAt: null }),
      );
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(producer.renderEmail).toHaveBeenCalledTimes(1);
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['existing-1']));
    });

    it('skips without mailing when the email channel is off and the ledger row already exists', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: null }),
      );
      const producer = makeProducer([makeRowFacts()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('leaves the row unsent, logs, and rethrows when queueing the email rejects', async () => {
      const queueError = new Error('database unreachable');
      mailService.enqueue.mockRejectedValue(queueError);
      const service = build([makeProducer([makeRowFacts()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(AggregateError);
      expect((rejection as AggregateError).errors).toEqual([queueError]);
      expect(sentIds.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: queueError }));
    });

    it('rethrows and queues nothing when marking the row sent fails', async () => {
      const dbError = new Error('database unreachable');
      userNotificationRepository.markEmailSentTx.mockRejectedValue(dbError);
      const service = build([makeProducer([makeRowFacts()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([dbError]);
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('leaves the row unsent on a failed enqueue so the retry queues exactly once', async () => {
      const service = build([makeProducer([makeRowFacts()])]);
      mailService.enqueue.mockRejectedValueOnce(new Error('database unreachable'));

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: null }),
      );
      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();
      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).toHaveBeenCalledTimes(2);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it.each([
      ['findOneById', () => userRepository.findOneById],
      ['findAllByUser', () => notificationPreferenceRepository.findAllByUser],
      ['insertTx', () => userNotificationRepository.insertTx],
    ])('rethrows when %s fails and sends no mail', async (_label, getMock) => {
      const dbError = new Error('connection reset');
      getMock().mockRejectedValue(dbError);
      const service = build([makeProducer([makeRowFacts()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([dbError]);
      expect(mailService.enqueue).not.toHaveBeenCalled();
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
      const failingError = new Error('queue rejected b');
      mailService.enqueue.mockImplementation(async (content: { to: string }) => {
        if (content.to === 'b@example.test') throw failingError;
      });
      const service = build([
        makeProducer([
          makeRowFacts({ recipientUserId: 'a' }),
          makeRowFacts({ recipientUserId: 'b' }),
        ]),
      ]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([failingError]);
      expect(sentIds).toEqual(new Set(['row-a']));

      mailService.enqueue.mockReset().mockResolvedValue(undefined);
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, { recipientId }: { recipientId: string }) =>
          makeInsertedNotification({
            id: `row-${recipientId}`,
            recipientId,
            emailSentAt: recipientId === 'a' ? new Date('2026-01-02') : null,
          }),
      );

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(mailService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'b@example.test', subject: 'New comment' }),
        expect.anything(),
      );
      expect(sentIds).toEqual(new Set(['row-a', 'row-b']));
    });

    it('rethrows resolution and delivery failures together after every intent is attempted', async () => {
      const resolveError = new Error('notifier down');
      const queueError = new Error('database unreachable');
      const broken = makeProducer([]);
      (broken.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(resolveError);
      mailService.enqueue.mockRejectedValue(queueError);
      const service = build([broken, makeProducer([makeRowFacts()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([resolveError, queueError]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('publishes one created signal listing the recipients whose row shows in-app', async () => {
      notificationPreferenceRepository.findAllByUser.mockImplementation(async (userId: string) =>
        userId === 'email-only'
          ? [makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: false })]
          : [],
      );
      userRepository.findOneById.mockImplementation(async (id: string) =>
        makeUserRecord({ id, email: `${id}@example.test` }),
      );
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, params: { recipientId: string; inAppSuppressed: boolean }) =>
          makeInsertedNotification({
            id: `notification-${params.recipientId}`,
            recipientId: params.recipientId,
            inAppSuppressed: params.inAppSuppressed,
          }),
      );
      const service = build([
        makeProducer([
          makeRowFacts({ recipientUserId: 'in-app-a' }),
          makeRowFacts({ recipientUserId: 'email-only' }),
          makeRowFacts({ recipientUserId: 'in-app-b' }),
        ]),
      ]);

      await service.handleEvent(makeEvent());

      expect(jobQueue.publish).toHaveBeenCalledOnce();
      expect(jobQueue.publish).toHaveBeenCalledWith('user_notification.created', {
        recipientIds: ['in-app-a', 'in-app-b'],
      });
    });

    it('publishes nothing when every delivered row has in-app off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makeRecord({ category: 'comment.on_your_model', email: 'immediate', inApp: false }),
      ]);
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ inAppSuppressed: true }),
      );
      const service = build([makeProducer([makeRowFacts()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledOnce();
      expect(jobQueue.publish).not.toHaveBeenCalled();
    });

    it('publishes nothing when no recipient is delivered to', async () => {
      const service = build([makeProducer([])]);

      await service.handleEvent(makeEvent());

      expect(jobQueue.publish).not.toHaveBeenCalled();
    });

    it('still signals the rows it delivered when another delivery fails, then rethrows', async () => {
      userRepository.findOneById.mockImplementation(async (id: string) =>
        id === 'broken' ? Promise.reject(new Error('lookup failed')) : makeUserRecord({ id }),
      );
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, params: { recipientId: string }) =>
          makeInsertedNotification({ recipientId: params.recipientId }),
      );
      const service = build([
        makeProducer([
          makeRowFacts({ recipientUserId: 'broken' }),
          makeRowFacts({ recipientUserId: 'healthy' }),
        ]),
      ]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      expect(jobQueue.publish).toHaveBeenCalledWith('user_notification.created', {
        recipientIds: ['healthy'],
      });
    });

    it('fails the event job when the created signal cannot be published', async () => {
      const error = new Error('No realtime job was created');
      jobQueue.publish.mockRejectedValue(error);
      const service = build([makeProducer([makeRowFacts()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((caught: unknown) => caught);

      expect((rejection as AggregateError).errors).toEqual([error]);
      expect(mailService.enqueue).toHaveBeenCalledOnce();
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
      const producer = makeProducer([
        makeRowFacts({ recipientUserId: 'allowed-recipient' }),
        makeRowFacts({ recipientUserId: 'blocked-recipient' }),
      ]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(mailService.enqueue).toHaveBeenCalledOnce();
      expect(mailService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'allowed-recipient@example.test' }),
        expect.anything(),
      );
    });
  });
});

describe('userNotificationService markRead', () => {
  const userNotificationRepository = mockUserNotificationRepository();
  const domain = userNotificationDomain({ notificationProducers: [mockNotificationProducer()] });

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
  const domain = userNotificationDomain({
    notificationProducers: [mockNotificationProducer({ describeGroup: describeGroupByTarget })],
  });
  const mailService = { enqueue: vi.fn() };
  const mailDomain = {
    createNotificationSummaryEmail: vi.fn(),
    withOneClickUnsubscribe: makeMailDomain().withOneClickUnsubscribe,
  };
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const existingModels = new Map<string, string>();
  const getNotificationPreviewsQuery = {
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
    getNotificationPreviewsQuery,
    notificationEmailService: makeNotificationEmailService({
      userNotificationRepository,
      mailService,
      transactionManager: mockTransactionManager(),
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

  const sentIds = new Set<string>();
  let pendingRows: Array<UserNotificationRecord> = [];
  let sentDigests: Array<SentDigest> = [];

  function makeRow(
    id: string,
    category = 'comment.on_your_model',
    createdAt = new Date('2026-01-01T12:00:00Z'),
  ): UserNotificationRecord {
    return makeInsertedNotification({ id, category, createdAt });
  }

  function makeRecentRow(id: string, ageMs: number, category = 'comment.on_your_model') {
    return makeRow(id, category, new Date(Date.now() - ageMs));
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    existingModels.clear();
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

    it('resolves before the flush email has been queued', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [makeRecentRow('a', recentMs)];
      let finishSend: () => void = () => undefined;
      mailService.enqueue.mockImplementation(
        async () =>
          new Promise<void>((resolve) => {
            finishSend = resolve;
          }),
      );

      await service.updatePreferences('recipient-1', [
        { category: 'comment.on_your_model', email: 'immediate' },
      ]);

      expect(sentIds.size).toBe(0);
      await vi.waitFor(() => expect(mailService.enqueue).toHaveBeenCalled());
      finishSend();
      await vi.waitFor(() => expect(sentIds.has('a')).toBe(true));
    });

    it('logs a failed flush and still resolves, leaving the rows sendable', async () => {
      storeDaily('comment.on_your_model');
      pendingRows = [makeRecentRow('a', recentMs)];
      mailService.enqueue.mockRejectedValue(new Error('database unreachable'));

      await expect(
        service.updatePreferences('recipient-1', [
          { category: 'comment.on_your_model', email: 'immediate' },
        ]),
      ).resolves.toBeUndefined();
      await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());

      expect(sentIds.size).toBe(0);
    });
  });
});
