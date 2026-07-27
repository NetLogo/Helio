import type { NotificationCategoryInfo, NotificationChannels } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { CategoryPreferenceDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';

export type UserNotificationMapper = {
  toCategoryPreference: (
    info: NotificationCategoryInfo,
    resolved: NotificationChannels,
  ) => CategoryPreferenceDto;
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
  };
}
