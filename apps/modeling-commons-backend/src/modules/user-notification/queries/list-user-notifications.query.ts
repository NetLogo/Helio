import type { UserNotificationPaginatedResponse } from '#src/modules/user-notification/dtos/user-notification.paginated.response.dto.ts';
import type { ListUserNotificationsQueryDto } from '#src/modules/user-notification/dtos/user-notifications.request.dto.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export default function makeListUserNotificationsQuery({
  userNotificationRepository,
  notificationPreferenceRepository,
  userNotificationDomain,
  userNotificationMapper,
}: Dependencies) {
  return {
    async execute(
      userId: string,
      query: ListUserNotificationsQueryDto,
    ): Promise<UserNotificationPaginatedResponse> {
      const params = paginatedQueryBase(query);
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const categories = userNotificationDomain.inAppEnabledCategories(overrides);

      if (categories.length === 0) {
        return { count: 0, limit: params.limit, page: params.page, data: [], unreadCount: 0 };
      }

      const [page, unreadCount] = await Promise.all([
        userNotificationRepository.findAllByRecipient(
          userId,
          {
            categories,
            since: query.since ? new Date(query.since) : undefined,
            unreadOnly: query.unreadOnly,
          },
          params,
        ),
        userNotificationRepository.countUnread(userId, categories),
      ]);

      return {
        count: page.count,
        limit: page.limit,
        page: page.page,
        data: page.data.map((record) => userNotificationMapper.toResponse(record)),
        unreadCount,
      };
    },
  };
}
