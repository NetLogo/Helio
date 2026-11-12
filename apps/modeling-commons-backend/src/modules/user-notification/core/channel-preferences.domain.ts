import {
  notificationCategories,
  notificationCategoryCatalog,
  type NotificationCategory,
} from '#src/modules/notification-catalog.ts';
import type { Category } from '#src/modules/user-notification/core/types/index.ts';

export function isKnownCategory(value: string): value is NotificationCategory {
  return value in notificationCategoryCatalog;
}

export function resolveChannelPreferences(
  category: NotificationCategory,
  override?: Partial<Category.ChannelPreferences> | null,
): Category.ChannelPreferences {
  const { defaults } = notificationCategoryCatalog[category];
  const { email = defaults.email, inApp = defaults.inApp } = override ?? {};
  return { email, inApp };
}

export function resolvePreferencesByCategory(
  overrides: ReadonlyArray<Category.PreferenceOverride>,
): Record<NotificationCategory, Category.ChannelPreferences> {
  const overrideByCategory = new Map(
    overrides.map((override) => [override.category, override] as const),
  );
  return Object.fromEntries(
    notificationCategories.map((category) => [
      category,
      resolveChannelPreferences(category, overrideByCategory.get(category)),
    ]),
  ) as Record<NotificationCategory, Category.ChannelPreferences>;
}

export function isMuted(channels: Category.ChannelPreferences): boolean {
  return channels.email === 'off' && !channels.inApp;
}

export function sendsEmailImmediately(channels: Category.ChannelPreferences): boolean {
  return channels.email === 'immediate';
}

export function listCategoriesOf(
  notifications: ReadonlyArray<{ category: string }>,
): Array<NotificationCategory> {
  return [
    ...new Set(notifications.map((notification) => notification.category).filter(isKnownCategory)),
  ];
}

export function listInAppEnabledCategories(
  overrides: ReadonlyArray<Category.PreferenceOverride>,
): Array<NotificationCategory> {
  const preferences = resolvePreferencesByCategory(overrides);
  return notificationCategories.filter((category) => preferences[category].inApp);
}

export function listDailyCategories(
  overrides: ReadonlyArray<Category.PreferenceOverride>,
): Array<NotificationCategory> {
  const preferences = resolvePreferencesByCategory(overrides);
  return notificationCategories.filter((category) => preferences[category].email === 'daily');
}
