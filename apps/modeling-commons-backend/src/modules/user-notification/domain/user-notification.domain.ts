import notificationsConfig from '#src/config/notifications.ts';
import type { EventRecord } from '#src/modules/event/database/event.repository.port.ts';
import { notificationCategoryCatalog } from '#src/modules/notification-producers.ts';
import type { UserEntity } from '#src/modules/user/domain/user.types.ts';
import type { InsertUserNotificationParams } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import {
  NotificationCategoryClaimError,
  NotificationNotFoundError,
} from '#src/modules/user-notification/domain/user-notification.errors.ts';
import {
  buildDigest,
  groupNotifications,
} from '#src/modules/user-notification/domain/user-notification.grouping.ts';
import type {
  DeliverableRecipient,
  NotificationRow,
  DigestWindow,
  EmailModeByCategory,
  NotificationCategory,
  NotificationCategoryDefinition,
  NotificationCategoryInfo,
  NotificationChannels,
  NotificationRowFacts,
  NotificationPreviews,
  NotificationProducer,
} from '#src/modules/user-notification/domain/user-notification.types.ts';

const catalog: Readonly<Record<NotificationCategory, NotificationCategoryDefinition>> =
  notificationCategoryCatalog;

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

export function mapProducersByCategory<P extends Pick<NotificationProducer, 'name' | 'categories'>>(
  categoryIds: ReadonlyArray<NotificationCategory>,
  producers: ReadonlyArray<P>,
): ReadonlyMap<NotificationCategory, P> {
  return new Map(
    categoryIds.map((category) => {
      const claimants = producers.filter((claimant) => category in claimant.categories);
      const [producer] = claimants;
      if (claimants.length !== 1 || !producer) {
        throw new NotificationCategoryClaimError(
          category,
          claimants.map((claimant) => claimant.name),
        );
      }
      return [category, producer] as const;
    }),
  );
}

export default function userNotificationDomain({
  notificationProducers,
}: Pick<Dependencies, 'notificationProducers'>) {
  const producerByCategory = mapProducersByCategory(
    categories.map((info) => info.category),
    notificationProducers,
  );

  return {
    categories,

    getProducer(category: NotificationCategory): NotificationProducer {
      const producer = producerByCategory.get(category);
      if (!producer) throw new NotificationCategoryClaimError(category, []);
      return producer;
    },

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
      facts: NotificationRowFacts,
      channels: NotificationChannels,
    ): InsertUserNotificationParams {
      return {
        recipientId,
        eventId: event.id,
        category: facts.category,
        url: facts.url,
        payload: facts.payload,
        actorUserId: facts.actorUserId ?? null,
        targetType: facts.target?.type ?? null,
        targetId: facts.target?.id ?? null,
        inAppSuppressed: !channels.inApp,
      };
    },

    listInAppRecipientIds(
      ledgerRows: ReadonlyArray<{ recipientId: string; inAppSuppressed: boolean }>,
    ): Array<string> {
      return [
        ...new Set(ledgerRows.filter((row) => !row.inAppSuppressed).map((row) => row.recipientId)),
      ];
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

    listEmailEnabledRows<T extends NotificationRow>(
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

    groupNotifications(rows: ReadonlyArray<NotificationRow>) {
      return groupNotifications(rows, producerByCategory);
    },

    buildDigest(
      rows: ReadonlyArray<NotificationRow>,
      previews: ReadonlyMap<string, NotificationPreviews>,
    ) {
      return buildDigest(rows, previews, producerByCategory);
    },
  };
}
