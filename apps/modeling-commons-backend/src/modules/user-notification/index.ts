import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';

declare global {
  export interface Dependencies {
    userNotificationRepository: UserNotificationRepositoryPort;
    notificationPreferenceRepository: NotificationPreferenceRepositoryPort;
  }
}
