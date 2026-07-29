import type { NotificationPreferenceResponseDto } from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';

export default function makeGetNotificationPreferencesQuery({
  notificationPreferenceRepository,
  userNotificationDomain,
  userNotificationMapper,
}: Dependencies) {
  return {
    async execute(userId: string): Promise<NotificationPreferenceResponseDto> {
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const overrideByCategory = new Map(
        overrides
          .filter((override) => userNotificationDomain.isKnownCategory(override.category))
          .map((override) => [override.category, override]),
      );

      const categories = userNotificationDomain.categories.map((info) => {
        const resolved = userNotificationDomain.resolvePreference(
          info.category,
          overrideByCategory.get(info.category),
        );
        return userNotificationMapper.toCategoryPreference(info, resolved);
      });

      return { categories };
    },
  };
}
