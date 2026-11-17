import {
  isMuted,
  resolveChannelPreferences,
  sendsEmailImmediately,
} from '#src/modules/user-notification/core/channel-preferences.domain.ts';
import { hasDeliverableEmail } from '#src/modules/user-notification/core/recipient.domain.ts';
import {
  buildNewNotification,
  listInAppRecipientIds,
} from '#src/modules/user-notification/delivery/delivery.domain.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { userNotificationEventTypes } from '#src/modules/user-notification/user-notification.events.ts';
import { notifyRealtime } from '#src/shared/realtime/realtime-publisher.ts';
import { handleFailedDeliveries } from '#src/modules/user-notification/email/delivery-failures.ts';
import type {
  Category,
  Email,
  NewNotificationPayload,
  NotificationProducer,
} from '#src/modules/user-notification/core/types/index.ts';
import type {
  NotificationCategory,
  RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';

type ResolvedNotification = {
  producer: NotificationProducer;
  newNotification: NewNotificationPayload;
};

export default function makeNotificationDeliveryService({
  registeredNotificationModules: modules,
  transactionManager,
  notificationPreferenceRepository,
  userNotificationRepository,
  userRepository,
  notificationEmailService,
  getNotificationSubjectsQuery,
  db,
  realtimeTopics,
  logger,
}: Dependencies) {
  async function findDeliverableRecipient(newNotification: NewNotificationPayload) {
    const recipient = await userRepository.findOneById(newNotification.recipientId);
    if (!hasDeliverableEmail(recipient)) return undefined;

    const preferences = await notificationPreferenceRepository.findAllByUser(recipient.id);
    const override = preferences.find(
      (preference) => preference.category === newNotification.category,
    );
    const channels = resolveChannelPreferences(newNotification.category, override);
    if (isMuted(channels)) return undefined;

    return { recipient, channels };
  }

  async function recordNotification(
    event: EventRecord,
    recipient: Email.UserWithEmail,
    newNotification: NewNotificationPayload,
    channels: Category.ChannelPreferences,
  ) {
    return transactionManager.run(async (ctx) =>
      userNotificationRepository.insertTx(
        ctx,
        buildNewNotification(event, recipient.id, newNotification, channels),
      ),
    );
  }

  async function buildNotificationEmail(
    producer: NotificationProducer,
    notification: UserNotificationRecord,
    recipient: Email.UserWithEmail,
    category: NotificationCategory,
  ) {
    const subjects = await getNotificationSubjectsQuery.execute([notification], recipient.id);
    return {
      categories: [category],
      render: async (emailLinks: Email.Links) =>
        producer.renderEmail(
          notification,
          { id: recipient.id, email: recipient.email, name: recipient.name },
          subjects.of(notification.id),
          emailLinks,
        ),
    };
  }

  async function deliver(
    event: EventRecord,
    { producer, newNotification }: ResolvedNotification,
  ): Promise<UserNotificationRecord | undefined> {
    const deliverable = await findDeliverableRecipient(newNotification);
    if (!deliverable) return undefined;

    const { recipient, channels } = deliverable;
    const notification = await recordNotification(event, recipient, newNotification, channels);
    if (!sendsEmailImmediately(channels)) return notification;

    await notificationEmailService.queueNotifications(
      recipient.id,
      [notification.id],
      await buildNotificationEmail(producer, notification, recipient, newNotification.category),
    );
    return notification;
  }

  async function applyRedaction(
    module: RegisteredNotificationModule,
    event: EventRecord,
  ): Promise<void> {
    const redaction = module.producer.findRedaction(event);
    if (!redaction) return;
    await userNotificationRepository.redactPayloads(Object.keys(module.categories), redaction);
  }

  async function publishCreated(recipientIds: Array<string>): Promise<void> {
    const events = [...new Set(recipientIds)].map((resourceId) => ({
      type: userNotificationEventTypes.created,
      resourceId,
    }));
    await notifyRealtime(db, events, realtimeTopics);
  }

  return {
    async handleEvent(event: EventRecord): Promise<void> {
      const applicable = modules.filter((module) => module.eventTypes.includes(event.type));
      if (applicable.length === 0) return;

      const redactions = await Promise.allSettled(
        applicable.map(async (module) => applyRedaction(module, event)),
      );
      const resolutions = await Promise.allSettled(
        applicable.map(async ({ producer }) => {
          const newNotifications = await producer.buildNotifications(event);
          return newNotifications.map(
            (newNotification): ResolvedNotification => ({ producer, newNotification }),
          );
        }),
      );
      const resolved = resolutions
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      const deliveries = await Promise.allSettled(
        resolved.map(async (entry) => deliver(event, entry)),
      );
      const notifications = deliveries
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((notification) => notification !== undefined && notification !== null);
      const publications = await publishCreated(listInAppRecipientIds(notifications)).then(
        () => [],
        (reason: unknown): Array<PromiseRejectedResult> => [{ status: 'rejected', reason }],
      );
      handleFailedDeliveries(
        [
          { results: redactions, message: 'A producer failed to redact its notifications' },
          { results: resolutions, message: 'A producer failed to build its notifications' },
          { results: deliveries, message: 'Failed to deliver a notification' },
          { results: publications, message: 'Failed to publish the created notifications' },
        ],
        logger,
        {
          name: 'NotificationDeliveryService',
          summary: 'One or more notifications failed to resolve or deliver',
        },
      );
    },
  };
}
