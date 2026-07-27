import env from '#src/config/env.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { UnknownCategoryError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  NotificationCategory,
  NotificationIntent,
  NotificationLinks,
  Notifier,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

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
    userRepository,
    mailService,
    logger,
  }: Dependencies,
) {
  async function deliver(
    event: EventRecord,
    intent: NotificationIntent,
    links: NotificationLinks,
  ): Promise<void> {
    const recipient = await userRepository.findOneById(intent.recipientUserId);
    if (!recipient || recipient.deletedAt || recipient.banned || !recipient.email) return;

    const preferences = await notificationPreferenceRepository.findAllByUser(recipient.id);
    const override = preferences.find((preference) => preference.category === intent.category);
    const resolved = userNotificationDomain.resolvePreference(intent.category, override);

    if (!resolved.email && !resolved.inApp) return;

    let notificationId: string | undefined;
    if (resolved.inApp) {
      const inserted = await transactionManager.run(async (ctx) =>
        userNotificationRepository.insertTx(ctx, {
          recipientId: recipient.id,
          eventId: event.id,
          category: intent.category,
          title: intent.title,
          body: intent.body,
          url: intent.url,
        }),
      );
      // Undefined means an earlier pass already delivered this (eventId, recipientId,
      // category) - do not resend.
      if (!inserted) return;
      notificationId = inserted.id;
    }

    if (!resolved.email) return;

    try {
      const content = await intent.buildEmail(
        { id: recipient.id, email: recipient.email, name: recipient.name },
        links,
      );
      await mailService.sendMailAsync(content);
      if (notificationId) await userNotificationRepository.markEmailSent(notificationId, new Date());
    } catch (error) {
      logger.error({
        name: 'UserNotificationService',
        message: 'Failed to send a notification email',
        error,
      });
    }
  }

  return {
    handles(eventType: string): boolean {
      return notifiers.some((notifier) => notifier.eventTypes.includes(eventType));
    },

    async handleEvent(event: EventRecord): Promise<void> {
      const applicable = notifiers.filter((notifier) => notifier.eventTypes.includes(event.type));
      if (applicable.length === 0) return;

      const intents = (
        await Promise.all(applicable.map(async (notifier) => notifier.resolve(event)))
      ).flat();
      if (intents.length === 0) return;

      const links: NotificationLinks = {
        unsubscribeUrl: `mailto:${env.product.supportEmail}`,
        preferencesUrl: `${env.product.website}/settings/notifications`,
      };

      for (const intent of intents) {
        await deliver(event, intent, links);
      }
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

// No notifier is registered yet - dispatch is a no-op end to end until a producing
// module (e.g. model-comment) adds one via `createUserNotificationService`.
export default function makeUserNotificationService(deps: Dependencies) {
  return createUserNotificationService([], deps);
}
