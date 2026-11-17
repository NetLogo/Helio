import type { NotificationCategory } from '#src/modules/notification-catalog.ts';

export const userNotificationEventTypes = {
  created: 'user_notification.created',
} as const;

export type SendDigestJobData = {
  recipientId: string;
  since: string;
  until: string;
  categories: Array<NotificationCategory>;
};
