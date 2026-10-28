import notificationsConfig from '#src/config/notifications.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { modelCommentNotificationCategories } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import { NotificationNotFoundError } from '#src/modules/user-notification/domain/user-notification.errors.ts';
import {
  buildDigest,
  describeGroup,
  groupNotifications,
} from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import type {
  DeliverableRecipient,
  DigestRow,
  DigestWindow,
  EmailModeByCategory,
  NotificationCategory,
  NotificationCategoryDefinition,
  NotificationCategoryInfo,
  NotificationChannels,
  NotificationIntent,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

const catalog = {
  ...modelCommentNotificationCategories,
} as const satisfies Record<NotificationCategory, NotificationCategoryDefinition>;

const categories: Array<NotificationCategoryInfo> = (
  Object.keys(catalog) as Array<NotificationCategory>
).map((category) => ({ category, ...catalog[category] }));

function isKnownCategory(value: string): value is NotificationCategory {
  return value in catalog;
}

function resolvePreference(
  category: NotificationCategory,
  override?: Partial<NotificationChannels> | null,
): NotificationChannels {
  const defaults = catalog[category].defaults;
  return {
    email: override?.email ?? defaults.email,
    inApp: override?.inApp ?? defaults.inApp,
  };
}

function mapOverridesByCategory<T extends { category: string }>(
  overrides: ReadonlyArray<T>,
): Map<string, T> {
  return new Map(overrides.map((override) => [override.category, override] as const));
}

export default function userNotificationDomain() {
  return {
    categories,

    isKnownCategory,

    isDeliverableRecipient(recipient: UserEntity | undefined): recipient is DeliverableRecipient {
      return Boolean(recipient && !recipient.deletedAt && !recipient.banned && recipient.email);
    },

    isSuppressed(channels: NotificationChannels): boolean {
      return channels.email === 'off' && !channels.inApp;
    },

    isSendableNow(channels: NotificationChannels): boolean {
      return channels.email === 'immediate';
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

    resolvePreference,

    getDigestWindow(now: Date): DigestWindow {
      return {
        since: new Date(now.getTime() - notificationsConfig.windowMs),
        until: new Date(now.getTime() - notificationsConfig.minAgeMs),
      };
    },

    getFlushWindow(now: Date): DigestWindow {
      return { since: new Date(now.getTime() - notificationsConfig.windowMs), until: now };
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

    listInAppEnabledCategories(
      overrides: ReadonlyArray<Partial<NotificationChannels> & { category: string }>,
    ): Array<NotificationCategory> {
      const overrideByCategory = mapOverridesByCategory(overrides);
      return categories
        .filter(
          (info) => resolvePreference(info.category, overrideByCategory.get(info.category)).inApp,
        )
        .map((info) => info.category);
    },

    listEmailEnabledRows<T extends DigestRow>(
      rows: ReadonlyArray<T>,
      overrides: ReadonlyArray<Partial<NotificationChannels> & { category: string }>,
    ): Array<T> {
      const overrideByCategory = mapOverridesByCategory(overrides);
      return rows.filter(
        (row) =>
          isKnownCategory(row.category) &&
          resolvePreference(row.category, overrideByCategory.get(row.category)).email !== 'off',
      );
    },

    listFlushedCategories(
      previous: EmailModeByCategory,
      next: EmailModeByCategory,
    ): Array<NotificationCategory> {
      return categories
        .map((info) => info.category)
        .filter((category) => {
          const mode = next[category];
          return mode !== undefined && mode !== 'off' && mode !== previous[category];
        });
    },

    listDailyCategories(
      overrides: ReadonlyArray<Partial<NotificationChannels> & { category: string }>,
    ): Array<NotificationCategory> {
      const overrideByCategory = mapOverridesByCategory(overrides);
      return categories
        .filter(
          (info) =>
            resolvePreference(info.category, overrideByCategory.get(info.category)).email ===
            'daily',
        )
        .map((info) => info.category);
    },

    groupNotifications,

    describeGroup,

    buildDigest,
  };
}
