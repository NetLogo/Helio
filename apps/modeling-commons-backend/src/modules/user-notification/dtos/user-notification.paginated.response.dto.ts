import { Type, type Static } from 'typebox';

import { userNotificationResponseDtoSchema } from '#src/modules/user-notification/dtos/user-notification.response.dto.ts';
import { paginatedResponseBaseSchema } from '#src/shared/api/paginated.response.base.ts';

export const userNotificationPaginatedResponseSchema = Type.Intersect([
  paginatedResponseBaseSchema,
  Type.Object({
    data: Type.Array(userNotificationResponseDtoSchema),
    unreadCount: Type.Number({
      description: 'Unread notifications across every in-app category, ignoring the page filters',
    }),
  }),
]);

export type UserNotificationPaginatedResponse = Static<
  typeof userNotificationPaginatedResponseSchema
>;
