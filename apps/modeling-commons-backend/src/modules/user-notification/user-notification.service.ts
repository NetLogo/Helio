import links from '#src/config/links.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { handleFailedDeliveries } from '#src/modules/user-notification/delivery-failures.ts';
import type {
  DeliverableRecipient,
  EmailMode,
  EmailModeByCategory,
  NotificationCategory,
  NotificationIntent,
  NotificationLinks,
  Notifier,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { NotificationPreferenceResponseDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';

export type UpdatePreferenceInput = {
  category: NotificationCategory;
  email?: EmailMode;
  inApp?: boolean;
};

export function createUserNotificationService(
  notifiers: ReadonlyArray<Notifier>,
  {
    transactionManager,
    notificationPreferenceRepository,
    userNotificationRepository,
    userNotificationDomain,
    userNotificationMapper,
    userRepository,
    notificationEmailService,
    notificationDigestService,
    logger,
  }: Dependencies,
) {
  async function findDeliverableRecipient(intent: NotificationIntent) {
    const recipient = await userRepository.findOneById(intent.recipientUserId);
    if (!userNotificationDomain.isDeliverableRecipient(recipient)) return undefined;

    const preferences = await notificationPreferenceRepository.findAllByUser(recipient.id);
    const override = preferences.find((preference) => preference.category === intent.category);
    const channels = userNotificationDomain.resolvePreference(intent.category, override);
    if (userNotificationDomain.isSuppressed(channels)) return undefined;

    return { recipient, channels };
  }

  async function recordLedgerRow(
    event: EventRecord,
    recipient: DeliverableRecipient,
    intent: NotificationIntent,
  ) {
    // The row is the delivery ledger, not the feed entry, so it is written even when
    // `inApp` is off, its unique key is what stops a retried event resending the email.
    const inserted = await transactionManager.run(async (ctx) =>
      userNotificationRepository.insertTx(
        ctx,
        userNotificationDomain.createLedgerRow(event, recipient.id, intent),
      ),
    );
    return (
      inserted ??
      userNotificationRepository.findOneByDeliveryKey(event.id, recipient.id, intent.category)
    );
  }

  async function deliver(
    event: EventRecord,
    intent: NotificationIntent,
    emailLinks: NotificationLinks,
  ): Promise<void> {
    const deliverable = await findDeliverableRecipient(intent);
    if (!deliverable) return;

    const { recipient, channels } = deliverable;
    const ledger = await recordLedgerRow(event, recipient, intent);
    if (!ledger || !userNotificationDomain.isSendableNow(channels)) return;

    await notificationEmailService.queueRows([ledger.id], async () =>
      intent.buildEmail(
        { id: recipient.id, email: recipient.email, name: recipient.name },
        emailLinks,
      ),
    );
  }

  return {
    async handleEvent(event: EventRecord): Promise<void> {
      const applicable = notifiers.filter((notifier) => notifier.eventTypes.includes(event.type));
      if (applicable.length === 0) return;

      const resolutions = await Promise.allSettled(
        applicable.map(async (notifier) => notifier.resolve(event)),
      );
      const intents = resolutions
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      const emailLinks: NotificationLinks = {
        unsubscribeUrl: links.support(),
        preferencesUrl: links.notificationPreferences(),
      };

      const deliveries = await Promise.allSettled(
        intents.map(async (intent) => deliver(event, intent, emailLinks)),
      );
      handleFailedDeliveries(
        [
          { results: resolutions, message: 'A notifier failed to resolve intents' },
          { results: deliveries, message: 'Failed to deliver a notification' },
        ],
        logger,
        {
          name: 'UserNotificationService',
          summary: 'One or more notifications failed to resolve or deliver',
        },
      );
    },

    async markRead(userId: string, notificationId: string): Promise<void> {
      const notification = await userNotificationRepository.findOneById(notificationId);
      userNotificationDomain.assertOwnedByRecipient(notification, notificationId, userId);
      if (userNotificationDomain.isRead(notification)) return;

      await userNotificationRepository.markRead(notificationId, new Date());
    },

    async getPreferences(userId: string): Promise<NotificationPreferenceResponseDto> {
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const overrideByCategory = new Map(
        overrides
          .filter((override) => userNotificationDomain.isKnownCategory(override.category))
          .map((override) => [override.category, override]),
      );

      const categories = userNotificationDomain.categories.map((info) => {
        const resolved = userNotificationDomain.resolvePreference(
          info.category,
          overrideByCategory.get(info.category),
        );
        return userNotificationMapper.toCategoryPreference(info, resolved);
      });

      return { categories };
    },

    async updatePreferences(
      userId: string,
      preferences: Array<UpdatePreferenceInput>,
    ): Promise<void> {
      const { previous, next } = await transactionManager.run(async (ctx) => {
        const existing = await notificationPreferenceRepository.findAllByUserTx(ctx, userId);
        const existingByCategory = new Map(existing.map((row) => [row.category, row]));
        const previousModes: EmailModeByCategory = {};
        const nextModes: EmailModeByCategory = {};

        for (const preference of preferences) {
          const resolved = userNotificationDomain.resolvePreference(
            preference.category,
            existingByCategory.get(preference.category),
          );
          const email = preference.email ?? resolved.email;

          await notificationPreferenceRepository.upsertTx(ctx, {
            userId,
            category: preference.category,
            email,
            inApp: preference.inApp ?? resolved.inApp,
          });
          previousModes[preference.category] = resolved.email;
          nextModes[preference.category] = email;
        }

        return { previous: previousModes, next: nextModes };
      });

      const flushed = userNotificationDomain.listFlushedCategories(previous, next);
      if (flushed.length === 0) return;

      void notificationDigestService.queueFlushedDigest(userId, flushed).catch((error: unknown) => {
        logger.error({
          name: 'UserNotificationService',
          message: 'Failed to flush the notification digest',
          error,
        });
      });
    },
  };
}

export default function makeUserNotificationService(deps: Dependencies) {
  return createUserNotificationService([deps.modelCommentNotifier], deps);
}
