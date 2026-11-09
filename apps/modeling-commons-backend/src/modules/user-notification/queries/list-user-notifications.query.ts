import type { NotificationCategory } from '#src/modules/user-notification/domain/user-notification.types.ts';
import type { UserNotificationPaginatedResponse } from '#src/modules/user-notification/dtos/user-notification.paginated.response.dto.ts';
import type { ListUserNotificationsQueryDto } from '#src/modules/user-notification/dtos/user-notifications.request.dto.ts';
import { paginatedQueryBase } from '#src/shared/ddd/query.base.ts';

export default function makeListUserNotificationsQuery({
  userNotificationRepository,
  notificationPreferenceRepository,
  userNotificationDomain,
  userNotificationMapper,
  getNotificationPreviewsQuery,
}: Dependencies) {
  return {
    async execute(
      userId: string,
      query: ListUserNotificationsQueryDto,
    ): Promise<UserNotificationPaginatedResponse> {
      const params = paginatedQueryBase(query);
      const overrides = await notificationPreferenceRepository.findAllByUser(userId);
      const categories = userNotificationDomain.listInAppEnabledCategories(overrides);

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

      const previews = await getNotificationPreviewsQuery.execute(page.data, userId);

      return {
        count: page.count,
        limit: page.limit,
        page: page.page,
        data: page.data.map((record) => {
          const preview = previews.get(record.id) ?? { actor: null, target: null };
          const description = userNotificationDomain
            .getProducer(record.category as NotificationCategory)
            .describeRow(record, preview);
          return userNotificationMapper.toResponse(record, preview, description);
        }),
        unreadCount,
      };
    },
  };
}
