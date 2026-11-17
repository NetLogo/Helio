import { Type, type Static } from 'typebox';

import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const listUserNotificationsQueryDtoSchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    since: Type.Optional(
      Type.String({
        format: 'date-time',
        description: 'Only return notifications created at or after this instant',
        examples: ['2026-07-28T12:00:00.000Z'],
      }),
    ),
    unreadOnly: Type.Optional(
      Type.Boolean({ description: 'Only return notifications that have not been read yet' }),
    ),
  }),
]);

export type ListUserNotificationsQueryDto = Static<typeof listUserNotificationsQueryDtoSchema>;
