import type { NotificationPreferenceRepositoryPort } from '#src/modules/user-notification/preferences/database/notification-preference.repository.port.ts';
import type { UserNotificationRepositoryPort } from '#src/modules/user-notification/core/database/user-notification.repository.port.ts';
import type { RegisteredNotificationModule } from '#src/modules/notification-catalog.ts';
import type { UserNotificationMapper } from '#src/modules/user-notification/user-notification.mapper.ts';

declare global {
  export interface Dependencies {
    userNotificationRepository: UserNotificationRepositoryPort;
    notificationPreferenceRepository: NotificationPreferenceRepositoryPort;
    registeredNotificationModules: ReadonlyArray<RegisteredNotificationModule>;
    producerLookupDomain: ReturnType<
      typeof import('#src/modules/user-notification/core/producer-lookup.domain.ts').default
    >;
    userNotificationMapper: UserNotificationMapper;
    listNotificationsQuery: ReturnType<
      typeof import('#src/modules/user-notification/feed/list-notifications.query.ts').default
    >;
    feedService: ReturnType<
      typeof import('#src/modules/user-notification/feed/feed.service.ts').default
    >;
    getNotificationSubjectsQuery: ReturnType<
      typeof import('#src/modules/user-notification/core/get-notification-subjects.query.ts').default
    >;
    notificationEmailService: ReturnType<
      typeof import('#src/modules/user-notification/email/notification-email.service.ts').default
    >;
    notificationDigestService: ReturnType<
      typeof import('#src/modules/user-notification/digest/notification-digest.service.ts').default
    >;
    notificationPreferencesService: ReturnType<
      typeof import('#src/modules/user-notification/preferences/notification-preferences.service.ts').default
    >;
    notificationPreferenceUpdateService: ReturnType<
      typeof import('#src/modules/user-notification/delivery/notification-preference-update.service.ts').default
    >;
    notificationDeliveryService: ReturnType<
      typeof import('#src/modules/user-notification/delivery/notification-delivery.service.ts').default
    >;
  }
}
