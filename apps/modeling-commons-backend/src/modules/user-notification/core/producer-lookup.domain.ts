import {
  notificationCategories,
  type NotificationCategory,
  type RegisteredNotificationModule,
} from '#src/modules/notification-catalog.ts';
import { NotificationCategoryClaimError } from '#src/modules/user-notification/core/notification.errors.ts';
import type { NotificationProducer } from '#src/modules/user-notification/core/types/index.ts';

export function mapModulesByCategory<
  M extends Pick<RegisteredNotificationModule, 'name' | 'categories'>,
>(
  categoryIds: ReadonlyArray<NotificationCategory>,
  modules: ReadonlyArray<M>,
): Record<NotificationCategory, M> {
  return Object.fromEntries(
    categoryIds.map((category) => {
      const claimants = modules.filter((claimant) => category in claimant.categories);
      const [module] = claimants;
      if (claimants.length !== 1 || !module) {
        throw new NotificationCategoryClaimError(
          category,
          claimants.map((claimant) => claimant.name),
        );
      }
      return [category, module] as const;
    }),
  ) as Record<NotificationCategory, M>;
}

export default function producerLookupDomain({
  registeredNotificationModules,
}: Pick<Dependencies, 'registeredNotificationModules'>) {
  const moduleByCategory = mapModulesByCategory(
    notificationCategories,
    registeredNotificationModules,
  );

  return {
    moduleByCategory,

    getProducer(category: NotificationCategory): NotificationProducer {
      return moduleByCategory[category].producer;
    },
  };
}
