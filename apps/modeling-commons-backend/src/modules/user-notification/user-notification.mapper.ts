import type { UserNotificationRecord } from '#src/modules/user-notification/core/database/user-notification.record.ts';
import type { NotificationCategory } from '#src/modules/notification-catalog.ts';
import type {
  Category,
  Feed,
  NotificationSubjects,
} from '#src/modules/user-notification/core/types/index.ts';
import type { CategoryPreferenceDto } from '#src/modules/user-notification/preferences/dtos/notification-preference.response.dto.ts';
import type { UserNotificationResponseDto } from '#src/modules/user-notification/feed/dtos/user-notification.response.dto.ts';

export type UserNotificationMapper = {
  toCategoryPreference: (
    info: { category: NotificationCategory } & Category.Config,
    resolved: Category.ChannelPreferences,
  ) => CategoryPreferenceDto;
  toResponse: (
    record: UserNotificationRecord,
    subjects: NotificationSubjects,
    description: Feed.ItemText,
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

    toResponse(record, subjects, description) {
      return {
        id: record.id,
        category: record.category,
        title: description.title,
        body: description.body,
        url: record.url,
        actor: subjects.actor,
        target: subjects.target,
        createdAt: record.createdAt.toISOString(),
        readAt: record.readAt?.toISOString() ?? null,
      };
    },
  };
}
