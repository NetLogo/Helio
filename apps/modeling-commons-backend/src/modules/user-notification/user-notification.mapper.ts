import type { UserNotificationRecord } from '#src/modules/user-notification/database/user-notification.record.ts';
import type {
  NotificationCategory,
  NotificationCategoryInfo,
  NotificationChannels,
  NotificationDescription,
  NotificationPreviews,
} from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { CategoryPreferenceDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';
import type { UserNotificationResponseDto } from '#src/modules/user-notification/dtos/user-notification.response.dto.ts';

export type UserNotificationMapper = {
  toCategoryPreference: (
    info: NotificationCategoryInfo,
    resolved: NotificationChannels,
  ) => CategoryPreferenceDto;
  toResponse: (
    record: UserNotificationRecord,
    previews: NotificationPreviews,
    description: NotificationDescription,
  ) => UserNotificationResponseDto;
};

export default function userNotificationMapper(): UserNotificationMapper {
  return {
    toCategoryPreference(info, resolved) {
      return {
        category: info.category,
        label: info.label,
        description: info.description,
        email: resolved.email,
        inApp: resolved.inApp,
      };
    },

    toResponse(record, previews, description) {
      return {
        id: record.id,
        category: record.category as NotificationCategory,
        title: description.title,
        body: description.body,
        url: record.url,
        actor: previews.actor,
        target: previews.target,
        createdAt: record.createdAt.toISOString(),
        readAt: record.readAt?.toISOString() ?? null,
      };
    },
  };
}
