import type { ModelCommentNotificationPayloads } from '#src/modules/model-comment/notifications/model-comment.categories.ts';
import { modelCommentNotifications } from '#src/modules/model-comment/notifications/model-comment.notifications.ts';
import type {
  Category,
  NotificationProducer,
} from '#src/modules/user-notification/core/types/index.ts';

type NotificationModuleMetadata = {
  name: string;
  eventTypes: ReadonlyArray<string>;
  categories: Readonly<Record<string, Category.Config>>;
  producer: (deps: Dependencies) => NotificationProducer;
};

export type RegisteredNotificationModule = {
  name: string;
  eventTypes: ReadonlyArray<string>;
  categories: Readonly<Record<string, Category.Config>>;
  producer: NotificationProducer;
};

export const notificationModules = [
  modelCommentNotifications,
] as const satisfies ReadonlyArray<NotificationModuleMetadata>;

export type NotificationPayloads = ModelCommentNotificationPayloads;

export type NotificationCategory = keyof NotificationPayloads;

type RegisteredCategory = keyof (typeof notificationModules)[number]['categories'];

export const notificationCategoryCatalog = Object.fromEntries(
  notificationModules.flatMap((module) => Object.entries(module.categories)),
) as Readonly<
  Record<
    NotificationCategory,
    (typeof notificationModules)[number]['categories'][RegisteredCategory]
  >
>;

export const notificationCategories = Object.keys(
  notificationCategoryCatalog,
) as ReadonlyArray<NotificationCategory>;

export const notificationEventTypes = notificationModules.flatMap((module) => module.eventTypes);

export default function makeRegisteredNotificationModules(
  cradle: Dependencies,
): ReadonlyArray<RegisteredNotificationModule> {
  return notificationModules.map((module) => ({
    name: module.name,
    eventTypes: module.eventTypes,
    categories: module.categories,
    producer: module.producer(cradle),
  }));
}
