import type { UserNotification } from '#prisma/index';
import type { Notification } from '#src/modules/user-notification/core/types/index.ts';

export type UserNotificationRecord = Notification & Omit<UserNotification, keyof Notification>;

export function toUserNotificationRecord(row: UserNotification): UserNotificationRecord {
  return row as UserNotificationRecord;
}
