import { NotificationNotFoundError } from '#src/modules/user-notification/core/notification.errors.ts';

export function isRead(notification: { readAt: Date | null } | undefined): boolean {
  return Boolean(notification?.readAt);
}

export function assertOwnedByRecipient(
  notification: { id: string; recipientId: string } | undefined,
  notificationId: string,
  recipientId: string,
): void {
  if (notification?.recipientId !== recipientId) {
    throw new NotificationNotFoundError(notificationId);
  }
}
