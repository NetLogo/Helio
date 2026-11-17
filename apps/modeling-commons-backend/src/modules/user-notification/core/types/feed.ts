import type { NotificationCategory } from '#src/modules/notification-catalog.ts';

export type Filters = {
  categories: Array<NotificationCategory>;
  since?: Date;
  unreadOnly?: boolean;
};

export type ItemText = { title: string; body: string };
