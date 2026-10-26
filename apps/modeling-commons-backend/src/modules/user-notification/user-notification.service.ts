import links from '#src/config/links.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { UnknownCategoryError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  NotificationCategory,
  NotificationIntent,
  NotificationLinks,
  Notifier,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { NotificationPreferenceResponseDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';

export type UpdatePreferenceInput = {
  category: string;
  email?: boolean;
  inApp?: boolean;
};

type ValidatedPreferenceInput = {
  category: NotificationCategory;
  email?: boolean;
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
    mailService,
    logger,
  }: Dependencies,
) {
  async function deliver(
    event: EventRecord,
    intent: NotificationIntent,
    emailLinks: NotificationLinks,
  ): Promise<void> {
    const recipient = await userRepository.findOneById(intent.recipientUserId);
    if (!userNotificationDomain.isDeliverableRecipient(recipient)) return;

    const preferences = await notificationPreferenceRepository.findAllByUser(recipient.id);
    const override = preferences.find((preference) => preference.category === intent.category);
    const resolved = userNotificationDomain.resolvePreference(intent.category, override);

    if (userNotificationDomain.isSuppressed(resolved)) return;

    // The row is the delivery ledger, not the feed entry, so it is written even when
    // `inApp` is off, its unique key is what stops a retried event resending the email.
    const inserted = await transactionManager.run(async (ctx) =>
      userNotificationRepository.insertTx(
        ctx,
        userNotificationDomain.createLedgerRow(event, recipient.id, intent),
      ),
    );
    const ledger =
      inserted ??
      (await userNotificationRepository.findOneByDeliveryKey(
        event.id,
        recipient.id,
        intent.category,
      ));
    if (!ledger || ledger.emailSentAt || !resolved.email) return;

    const content = await intent.buildEmail(
      { id: recipient.id, email: recipient.email, name: recipient.name },
      emailLinks,
    );
    await mailService.sendMailAsync(content);
    await userNotificationRepository
      .markEmailSent(ledger.id, new Date())
      .catch((error: unknown) => {
        logger.error({
          name: 'UserNotificationService',
          message: 'The email was sent but could not be marked as sent',
          error,
        });
      });
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
      const failedResolutions = resolutions.filter((result) => result.status === 'rejected');

      const emailLinks: NotificationLinks = {
        unsubscribeUrl: links.support(),
        preferencesUrl: links.notificationPreferences(),
      };

      const deliveries = await Promise.allSettled(
        intents.map(async (intent) => deliver(event, intent, emailLinks)),
      );
      const failedDeliveries = deliveries.filter((result) => result.status === 'rejected');

      for (const failure of failedResolutions) {
        logger.error({
          name: 'UserNotificationService',
          message: 'A notifier failed to resolve intents',
          error: failure.reason,
        });
      }
      for (const failure of failedDeliveries) {
        logger.error({
          name: 'UserNotificationService',
          message: 'Failed to deliver a notification',
          error: failure.reason,
        });
      }

      const failures = [...failedResolutions, ...failedDeliveries];
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason as unknown),
          'One or more notifications failed to resolve or deliver',
        );
      }
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
      const validated: Array<ValidatedPreferenceInput> = preferences.map((preference) => {
        const { category } = preference;
        if (!userNotificationDomain.isKnownCategory(category)) {
          throw new UnknownCategoryError(category);
        }
        return { category, email: preference.email, inApp: preference.inApp };
      });

      const existing = await notificationPreferenceRepository.findAllByUser(userId);
      const existingByCategory = new Map(existing.map((row) => [row.category, row]));

      await transactionManager.run(async (ctx) => {
        for (const preference of validated) {
          const resolved = userNotificationDomain.resolvePreference(
            preference.category,
            existingByCategory.get(preference.category),
          );

          await notificationPreferenceRepository.upsertTx(ctx, {
            userId,
            category: preference.category,
            email: preference.email ?? resolved.email,
            inApp: preference.inApp ?? resolved.inApp,
          });
        }
      });
    },
  };
}

export default function makeUserNotificationService(deps: Dependencies) {
  return createUserNotificationService([deps.modelCommentNotifier], deps);
}
