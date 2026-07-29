import { Type, type Static } from 'typebox';

import { NOTIFICATION_CATEGORIES } from '#src/modules/user-notification/domain/user-notification.types.ts';

export const userNotificationResponseDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  category: Type.Enum(NOTIFICATION_CATEGORIES),
  title: Type.String(),
  body: Type.String(),
  url: Type.String({ format: 'uri' }),
  createdAt: Type.String({ format: 'date-time' }),
  readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export type UserNotificationResponseDto = Static<typeof userNotificationResponseDtoSchema>;
