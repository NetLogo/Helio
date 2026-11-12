import {
  notificationCategories,
  notificationCategoryCatalog,
  type NotificationCategory,
} from '#src/modules/notification-catalog.ts';
import type { Category } from '#src/modules/user-notification/core/types/index.ts';

export const categories: Array<{ category: NotificationCategory } & Category.Config> =
  notificationCategories.map((category) => ({
    category,
    ...notificationCategoryCatalog[category],
  }));

export function listCategoriesSwitchedOn(
  previous: Category.EmailModeByCategory,
  next: Category.EmailModeByCategory,
): Array<NotificationCategory> {
  return notificationCategories.filter((category) => {
    const mode = next[category];
    return mode !== undefined && mode !== 'off' && mode !== previous[category];
  });
}
