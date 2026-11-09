import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/database/notification-preference.repository.port.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/database/user-notification.repository.port.ts';
import type userNotificationDomain from '#src/modules/user-notification/domain/user-notification.domain.ts';
import type { NotificationProducer } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { UserNotificationMapper } from '#src/modules/user-notification/user-notification.mapper.ts';

declare global {
  export interface Dependencies {
    userNotificationRepository: UserNotificationRepositoryPort;
    notificationPreferenceRepository: NotificationPreferenceRepositoryPort;
    notificationProducers: ReadonlyArray<NotificationProducer>;
    userNotificationDomain: ReturnType<typeof userNotificationDomain>;
    userNotificationMapper: UserNotificationMapper;
    listUserNotificationsQuery: ReturnType<
      typeof import('#src/modules/user-notification/queries/list-user-notifications.query.ts').default
    >;
    getNotificationPreviewsQuery: ReturnType<
      typeof import('#src/modules/user-notification/queries/get-notification-previews.query.ts').default
    >;
    notificationEmailService: ReturnType<
      typeof import('#src/modules/user-notification/notification-email.service.ts').default
    >;
    notificationDigestService: ReturnType<
      typeof import('#src/modules/user-notification/notification-digest.service.ts').default
    >;
    userNotificationService: ReturnType<
      typeof import('#src/modules/user-notification/user-notification.service.ts').default
    >;
  }
}
