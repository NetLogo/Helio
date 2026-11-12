import { makeSubjectsByNotificationId } from '#src/modules/user-notification/core/subjects.domain.ts';
import {
  type RegisteredNotificationModule,
  notificationCategoryCatalog,
} from '#src/modules/notification-catalog.ts';
import userDomain from '#src/modules/user/domain/user.domain.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import makeNotificationDeliveryService from '#src/modules/user-notification/delivery/notification-delivery.service.ts';
import makeNotificationEmailService from '#src/modules/user-notification/email/notification-email.service.ts';
import { readUnsubscribeToken } from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';
import { mockRegisteredNotificationModule } from '#src/modules/user-notification/__tests__/producer.mock.ts';
import makeMailDomain from '#src/modules/mail/domain/mail.domain.ts';
import {
  makeEvent,
  makeInsertedNotification,
  makeNewNotification,
  makeProducer,
  makeUserRecord,
} from '#src/modules/user-notification/__tests__/notification.mock.ts';
import userNotificationMapper from '#src/modules/user-notification/user-notification.mapper.ts';
import {
  makePreferenceRecord,
  mockNotificationPreferenceRepository,
} from '#src/modules/user-notification/preferences/database/notification-preference.repository.mock.ts';
import {
  fakeMarkEmailSent,
  mockUserNotificationRepository,
} from '#src/modules/user-notification/core/database/user-notification.repository.mock.ts';
import { mockTransactionManager } from '#src/shared/test/mock-transaction-manager.ts';
import { realtimeTopics } from '#src/modules/realtime-topics.ts';
import type { NotificationSubjects } from '#src/modules/user-notification/core/types/index.ts';
import { mockPort } from '#src/shared/test/mock-port.ts';
import type { UserRepository } from '#src/modules/user/database/user.repository.port.ts';

describe('notificationDeliveryService handleEvent', () => {
  const notificationPreferenceRepository = mockNotificationPreferenceRepository();
  const userNotificationRepository = mockUserNotificationRepository();
  const userRepository = mockPort<UserRepository>();
  const transactionManager = mockTransactionManager();
  const mailService = { enqueue: vi.fn() };
  const db = { $executeRaw: vi.fn() };
  const notifiedRecipientIds = () =>
    db.$executeRaw.mock.calls.map((call) =>
      (call[2] as Array<string>).map(
        (payload) => (JSON.parse(payload) as { topic: { id: string } }).topic.id,
      ),
    );
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const getNotificationSubjectsQuery = { execute: vi.fn() };
  const recipientSubjects: NotificationSubjects = {
    actor: { name: 'Alicia', thumbnailUrl: null, url: 'https://example.test/users/alice' },
    target: { name: null, thumbnailUrl: null, url: 'https://example.test/models/model-1' },
  };

  function build(modules: Array<RegisteredNotificationModule>) {
    return makeNotificationDeliveryService({
      registeredNotificationModules: modules,
      transactionManager,
      notificationPreferenceRepository,
      userNotificationRepository,
      userDomain: userDomain(),
      userNotificationMapper: userNotificationMapper(),
      userRepository,
      notificationEmailService: makeNotificationEmailService({
        userNotificationRepository,
        mailService,
        mailDomain: makeMailDomain(),
        transactionManager,
      } as never),
      getNotificationSubjectsQuery,
      mailDomain: makeMailDomain(),
      db,
      realtimeTopics,
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
    db.$executeRaw.mockReset().mockResolvedValue(0);
    logger.error.mockReset();
    getNotificationSubjectsQuery.execute
      .mockReset()
      .mockImplementation(async (notifications: Array<{ id: string }>) =>
        makeSubjectsByNotificationId(
          notifications.map((notification) => [notification.id, recipientSubjects]),
        ),
      );
  });

  describe('handleEvent', () => {
    it('is a no-op when no notifier handles the event type', async () => {
      const notifier = makeProducer([makeNewNotification()]);
      const service = build([notifier]);

      await service.handleEvent(makeEvent({ type: 'model.deleted' }));

      expect(notifier.producer.buildNotifications).not.toHaveBeenCalled();
      expect(userRepository.findOneById).not.toHaveBeenCalled();
    });

    it("still delivers a healthy notifier's intents when another notifier throws, then rethrows", async () => {
      const healthy = makeProducer([makeNewNotification()]);
      const broken = makeProducer([]);
      (broken.producer.buildNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('notifier down'),
      );
      const service = build([broken, healthy]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });

    it("redacts the producer's own notifications with the redaction it derives from the event", async () => {
      userNotificationRepository.redactPayloads.mockReset().mockResolvedValue(2);
      const redaction = {
        match: { payloadKey: 'commentId', value: 'comment-1' },
        payloadFields: ['excerpt'],
      };
      const module = mockRegisteredNotificationModule(
        { findRedaction: vi.fn().mockReturnValue(redaction) },
        {
          categories: {
            'comment.reply_to_you': notificationCategoryCatalog['comment.reply_to_you'],
          },
        },
      );
      const service = build([module]);
      const event = makeEvent({ type: 'model_comment.created' });

      await service.handleEvent(event);

      expect(module.producer.findRedaction).toHaveBeenCalledWith(event);
      expect(userNotificationRepository.redactPayloads).toHaveBeenCalledExactlyOnceWith(
        ['comment.reply_to_you'],
        redaction,
      );
    });

    it('redacts nothing when the producer derives no redaction from the event', async () => {
      userNotificationRepository.redactPayloads.mockReset();
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.redactPayloads).not.toHaveBeenCalled();
    });

    it('rethrows a failed redaction so the event is retried', async () => {
      userNotificationRepository.redactPayloads.mockReset().mockRejectedValue(new Error('db down'));
      const producer = mockRegisteredNotificationModule({
        findRedaction: vi.fn().mockReturnValue({
          match: { payloadKey: 'commentId', value: 'c' },
          payloadFields: ['excerpt'],
        }),
      });
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);
    });

    it('inserts a notification and sends mail for a fully opted-in recipient', async () => {
      const producer = makeProducer([makeNewNotification()]);
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
      expect(producer.producer.renderEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'notification-1' }),
        { id: 'recipient-1', email: 'recipient@example.test', name: 'Recipient' },
        recipientSubjects,
        expect.objectContaining({
          preferencesUrl: expect.stringContaining('/settings/notifications'),
        }),
      );
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it("links the email to an unsubscribe for the recipient and the notification's category only", async () => {
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      const [, , , emailLinks] = vi.mocked(producer.producer.renderEmail).mock.calls[0]!;
      const pageToken = new URL(emailLinks.unsubscribeUrl).searchParams.get('token') ?? '';
      expect(await readUnsubscribeToken(pageToken)).toEqual({
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
      expect(await readUnsubscribeToken(oneClickToken)).toEqual({
        userId: 'recipient-1',
        categories: ['comment.on_your_model'],
      });
    });

    it('renders the email from the notification and the recipient subjects', async () => {
      const notification = makeInsertedNotification({
        actorId: 'commenter-1',
        targetType: 'model',
        targetId: 'model-1',
      });
      userNotificationRepository.insertTx.mockResolvedValue(notification);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(getNotificationSubjectsQuery.execute).toHaveBeenCalledWith(
        [notification],
        'recipient-1',
      );
      expect(producer.producer.renderEmail).toHaveBeenCalledWith(
        notification,
        expect.objectContaining({ id: 'recipient-1' }),
        recipientSubjects,
        expect.anything(),
      );
    });

    it('fails the delivery, leaves the notification unsent and rethrows when the subjects lookup rejects', async () => {
      const lookupError = new Error('subjects unavailable');
      getNotificationSubjectsQuery.execute.mockRejectedValue(lookupError);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([lookupError]);
      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: lookupError }));
    });

    it('stores the references an intent carries, not resolved urls', async () => {
      const producer = makeProducer([
        makeNewNotification({
          actorId: 'commenter-1',
          target: { type: 'model', id: 'model-1' },
        }),
      ]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          actorId: 'commenter-1',
          targetType: 'model',
          targetId: 'model-1',
        }),
      );
    });

    it('writes null columns for an intent that references neither', async () => {
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ actorId: null, targetType: null, targetId: null }),
      );
    });

    it('stores a target reference for an intent with no actor', async () => {
      const producer = makeProducer([
        makeNewNotification({ target: { type: 'model', id: 'model-1' } }),
      ]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ actorId: null, targetType: 'model', targetId: 'model-1' }),
      );
    });

    it('sends no mail and writes no notification for a recipient fully opted out of the category', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.on_your_model', email: 'off', inApp: false }),
      ]);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('records an immediate notification and sends it right away when email is immediate', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({
          category: 'comment.on_your_model',
          email: 'immediate',
          inApp: true,
        }),
      ]);
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('records a daily notification and leaves it unsent when email is daily', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.on_your_model', email: 'daily', inApp: true }),
      ]);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds.size).toBe(0);
    });

    it('records a notification and sends nothing when email is off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalled();
      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('still writes the notification when only the in-app channel is off, so a retry cannot resend', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({
          category: 'comment.on_your_model',
          email: 'immediate',
          inApp: false,
        }),
      ]);
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledTimes(1);
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('stamps the notification as suppressed in-app when the in-app channel is off at delivery', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({
          category: 'comment.on_your_model',
          email: 'immediate',
          inApp: false,
        }),
      ]);
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ inAppSuppressed: true }),
      );
    });

    it('leaves the notification visible in-app when the in-app channel is on at delivery', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({
          category: 'comment.on_your_model',
          email: 'immediate',
          inApp: true,
        }),
      ]);
      const service = build([makeProducer([makeNewNotification()])]);

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
    ])('skips %s without writing a notification or rendering an email', async (_label, record) => {
      userRepository.findOneById.mockResolvedValue(record);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(userNotificationRepository.insertTx).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('skips without mailing when a retry finds a notification already marked sent', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: new Date('2026-01-02') }),
      );
      userNotificationRepository.markEmailSentTx.mockResolvedValue([]);
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('queues nothing when another path already marked the notification sent', async () => {
      sentIds.add('notification-1');
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(mailService.enqueue).not.toHaveBeenCalled();
      expect(sentIds).toEqual(new Set(['notification-1']));
    });

    it('resumes and mails when a retry finds a notification whose email was never sent', async () => {
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ id: 'existing-1', emailSentAt: null }),
      );
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await service.handleEvent(makeEvent());

      expect(producer.producer.renderEmail).toHaveBeenCalledTimes(1);
      expect(mailService.enqueue).toHaveBeenCalledTimes(1);
      expect(sentIds).toEqual(new Set(['existing-1']));
    });

    it('skips without mailing when the email channel is off and the notification already exists', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({ category: 'comment.on_your_model', email: 'off', inApp: true }),
      ]);
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ emailSentAt: null }),
      );
      const producer = makeProducer([makeNewNotification()]);
      const service = build([producer]);

      await expect(service.handleEvent(makeEvent())).resolves.toBeUndefined();

      expect(producer.producer.renderEmail).not.toHaveBeenCalled();
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('leaves the notification unsent, logs, and rethrows when queueing the email rejects', async () => {
      const queueError = new Error('database unreachable');
      mailService.enqueue.mockRejectedValue(queueError);
      const service = build([makeProducer([makeNewNotification()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(AggregateError);
      expect((rejection as AggregateError).errors).toEqual([queueError]);
      expect(sentIds.size).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ error: queueError }));
    });

    it('rethrows and queues nothing when marking the notification sent fails', async () => {
      const dbError = new Error('database unreachable');
      userNotificationRepository.markEmailSentTx.mockRejectedValue(dbError);
      const service = build([makeProducer([makeNewNotification()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([dbError]);
      expect(mailService.enqueue).not.toHaveBeenCalled();
    });

    it('leaves the notification unsent on a failed enqueue so the retry queues exactly once', async () => {
      const service = build([makeProducer([makeNewNotification()])]);
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
      const service = build([makeProducer([makeNewNotification()])]);

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
            id: `notification-${params.recipientId}`,
            recipientId: params.recipientId,
          }),
      );
      const failingError = new Error('queue rejected b');
      mailService.enqueue.mockImplementation(async (content: { to: string }) => {
        if (content.to === 'b@example.test') throw failingError;
      });
      const service = build([
        makeProducer([
          makeNewNotification({ recipientId: 'a' }),
          makeNewNotification({ recipientId: 'b' }),
        ]),
      ]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([failingError]);
      expect(sentIds).toEqual(new Set(['notification-a']));

      mailService.enqueue.mockReset().mockResolvedValue(undefined);
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, { recipientId }: { recipientId: string }) =>
          makeInsertedNotification({
            id: `notification-${recipientId}`,
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
      expect(sentIds).toEqual(new Set(['notification-a', 'notification-b']));
    });

    it('rethrows resolution and delivery failures together after every intent is attempted', async () => {
      const resolveError = new Error('notifier down');
      const queueError = new Error('database unreachable');
      const broken = makeProducer([]);
      (broken.producer.buildNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
        resolveError,
      );
      mailService.enqueue.mockRejectedValue(queueError);
      const service = build([broken, makeProducer([makeNewNotification()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((error: unknown) => error);

      expect((rejection as AggregateError).errors).toEqual([resolveError, queueError]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('publishes one created signal listing the recipients whose notification shows in-app', async () => {
      notificationPreferenceRepository.findAllByUser.mockImplementation(async (userId: string) =>
        userId === 'email-only'
          ? [
              makePreferenceRecord({
                category: 'comment.on_your_model',
                email: 'immediate',
                inApp: false,
              }),
            ]
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
          makeNewNotification({ recipientId: 'in-app-a' }),
          makeNewNotification({ recipientId: 'email-only' }),
          makeNewNotification({ recipientId: 'in-app-b' }),
        ]),
      ]);

      await service.handleEvent(makeEvent());

      expect(notifiedRecipientIds()).toEqual([['in-app-a', 'in-app-b']]);
    });

    it('publishes nothing when every delivered notification has in-app off', async () => {
      notificationPreferenceRepository.findAllByUser.mockResolvedValue([
        makePreferenceRecord({
          category: 'comment.on_your_model',
          email: 'immediate',
          inApp: false,
        }),
      ]);
      userNotificationRepository.insertTx.mockResolvedValue(
        makeInsertedNotification({ inAppSuppressed: true }),
      );
      const service = build([makeProducer([makeNewNotification()])]);

      await service.handleEvent(makeEvent());

      expect(userNotificationRepository.insertTx).toHaveBeenCalledOnce();
      expect(db.$executeRaw).not.toHaveBeenCalled();
    });

    it('publishes nothing when no recipient is delivered to', async () => {
      const service = build([makeProducer([])]);

      await service.handleEvent(makeEvent());

      expect(db.$executeRaw).not.toHaveBeenCalled();
    });

    it('still signals the notifications it delivered when another delivery fails, then rethrows', async () => {
      userRepository.findOneById.mockImplementation(async (id: string) =>
        id === 'broken' ? Promise.reject(new Error('lookup failed')) : makeUserRecord({ id }),
      );
      userNotificationRepository.insertTx.mockImplementation(
        async (_ctx: unknown, params: { recipientId: string }) =>
          makeInsertedNotification({ recipientId: params.recipientId }),
      );
      const service = build([
        makeProducer([
          makeNewNotification({ recipientId: 'broken' }),
          makeNewNotification({ recipientId: 'healthy' }),
        ]),
      ]);

      await expect(service.handleEvent(makeEvent())).rejects.toThrow(AggregateError);

      expect(notifiedRecipientIds()).toEqual([['healthy']]);
    });

    it('fails the event job when the created signal cannot be published', async () => {
      const error = new Error('NOTIFY failed');
      db.$executeRaw.mockRejectedValue(error);
      const service = build([makeProducer([makeNewNotification()])]);

      const rejection = await service.handleEvent(makeEvent()).catch((caught: unknown) => caught);

      expect((rejection as AggregateError).errors).toEqual([error]);
      expect(mailService.enqueue).toHaveBeenCalledOnce();
    });

    it('applies preferences and recipient checks independently per intent', async () => {
      notificationPreferenceRepository.findAllByUser.mockImplementation(async (userId: string) =>
        userId === 'blocked-recipient'
          ? [
              makePreferenceRecord({
                category: 'comment.on_your_model',
                email: 'off',
                inApp: false,
              }),
            ]
          : [],
      );
      userRepository.findOneById.mockImplementation(async (id: string) =>
        makeUserRecord({ id, email: `${id}@example.test` }),
      );
      const producer = makeProducer([
        makeNewNotification({ recipientId: 'allowed-recipient' }),
        makeNewNotification({ recipientId: 'blocked-recipient' }),
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
