import { modelCommentNotifications } from '#src/modules/model-comment/notifications/model-comment.notifications.ts';
import type { EmailMode } from '#prisma/index';

type NotificationModule = {
  producer: (deps: Dependencies) => unknown;
  eventTypes: ReadonlyArray<string>;
  categories: Readonly<
    Record<
      string,
      {
        label: string;
        description: string;
        defaults: { email: EmailMode; inApp: boolean };
      }
    >
  >;
};

export const notificationModules = [
  modelCommentNotifications,
] as const satisfies ReadonlyArray<NotificationModule>;

type CategoriesOf<M> = M extends { categories: infer C } ? keyof C : never;

export type NotificationCategory = CategoriesOf<(typeof notificationModules)[number]>;

export const notificationCategoryCatalog = Object.fromEntries(
  notificationModules.flatMap((module) => Object.entries(module.categories)),
) as Readonly<Record<NotificationCategory, NotificationModule['categories'][string]>>;

export const NOTIFICATION_CATEGORIES = Object.keys(
  notificationCategoryCatalog,
) as ReadonlyArray<NotificationCategory>;

export function listNotificationEventTypes(
  modules: ReadonlyArray<Pick<NotificationModule, 'eventTypes'>>,
): ReadonlyArray<string> {
  return modules.flatMap((module) => module.eventTypes);
}

export const notificationEventTypes = listNotificationEventTypes(notificationModules);

export default function makeNotificationProducers(cradle: Dependencies) {
  return notificationModules.map((module) => module.producer(cradle));
}
