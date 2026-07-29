import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import type { UserNotificationMapper } from '#src/modules/user-notification/user-notification.mapper.ts';

declare global {
  export interface Dependencies {
    userNotificationRepository: UserNotificationRepositoryPort;
    notificationPreferenceRepository: NotificationPreferenceRepositoryPort;
    userNotificationDomain: ReturnType<typeof userNotificationDomain>;
    userNotificationMapper: UserNotificationMapper;
    getNotificationPreferencesQuery: ReturnType<
      typeof import('#src/modules/user-notification/queries/get-notification-preferences.query.ts').default
    >;
    listUserNotificationsQuery: ReturnType<
      typeof import('#src/modules/user-notification/queries/list-user-notifications.query.ts').default
    >;
    userNotificationService: ReturnType<
      typeof import('#src/modules/user-notification/user-notification.service.ts').default
    >;
  }
}
