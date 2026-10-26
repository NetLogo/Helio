import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import { NotificationNotFoundError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import type {
  NotificationCategory,
  NotificationCategoryInfo,
  NotificationChannels,
  NotificationIntent,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

const catalog = {
  'comment.on_your_model': {
    label: 'Comments on your models',
    description: 'When someone comments on a model you author.',
    defaults: { email: true, inApp: true },
  },
  'comment.reply_to_you': {
    label: 'Replies to your comments',
    description: 'When someone replies directly to a comment you wrote.',
    defaults: { email: true, inApp: true },
  },
  'general.daily_digest': {
    label: 'Daily digest',
    description: 'A daily summary of activity relevant to you.',
    defaults: { email: true, inApp: false },
  },
} as const satisfies Record<NotificationCategory, Omit<NotificationCategoryInfo, 'category'>>;

const categories: Array<NotificationCategoryInfo> = (
  Object.keys(catalog) as Array<NotificationCategory>
).map((category) => ({ category, ...catalog[category] }));

function resolveChannels(
  category: NotificationCategory,
  override?: Partial<NotificationChannels> | null,
): NotificationChannels {
  const defaults = catalog[category].defaults;
  return {
    email: override?.email ?? defaults.email,
    inApp: override?.inApp ?? defaults.inApp,
  };
}

export default function userNotificationDomain() {
  return {
    categories,

    isKnownCategory(value: string): value is NotificationCategory {
      return value in catalog;
    },

    resolvePreference: resolveChannels,

    inAppEnabledCategories(
      overrides: ReadonlyArray<Partial<NotificationChannels> & { category: string }>,
    ): Array<NotificationCategory> {
      const overrideByCategory = new Map(
        overrides.map((override) => [override.category, override] as const),
      );
      return categories
        .filter(
          (info) => resolveChannels(info.category, overrideByCategory.get(info.category)).inApp,
        )
        .map((info) => info.category);
    },

    isDeliverableRecipient(
      recipient: UserEntity | undefined,
    ): recipient is UserEntity & { email: string } {
      return Boolean(recipient && !recipient.deletedAt && !recipient.banned && recipient.email);
    },

    isSuppressed(channels: NotificationChannels): boolean {
      return !channels.email && !channels.inApp;
    },

    createLedgerRow(
      event: EventRecord,
      recipientId: string,
      intent: NotificationIntent,
    ): InsertUserNotificationParams {
      return {
        recipientId,
        eventId: event.id,
        category: intent.category,
        title: intent.title,
        body: intent.body,
        url: intent.url,
        actorUserId: intent.actorUserId ?? null,
        targetType: intent.target?.type ?? null,
        targetId: intent.target?.id ?? null,
      };
    },

    isRead(notification: { readAt: Date | null } | undefined): boolean {
      return Boolean(notification?.readAt);
    },

    assertOwnedByRecipient(
      notification: { id: string; recipientId: string } | undefined,
      notificationId: string,
      recipientId: string,
    ): void {
      if (notification?.recipientId !== recipientId) {
        throw new NotificationNotFoundError(notificationId);
      }
    },
  };
}
