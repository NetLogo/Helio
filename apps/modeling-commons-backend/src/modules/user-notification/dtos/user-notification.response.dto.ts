import { Type, type Static } from 'typebox';

import { NOTIFICATION_CATEGORIES } from '#src/modules/user-notification/domain/user-notification.types.ts';

const notificationSubjectSchema = Type.Object({
  thumbnailUrl: Type.Union([Type.String(), Type.Null()]),
  url: Type.String({ format: 'uri' }),
});

export const userNotificationResponseDtoSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  category: Type.Enum(NOTIFICATION_CATEGORIES),
  title: Type.String(),
  body: Type.String(),
  url: Type.String({ format: 'uri' }),
  actor: Type.Union([notificationSubjectSchema, Type.Null()]),
  target: Type.Union([notificationSubjectSchema, Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export type UserNotificationResponseDto = Static<typeof userNotificationResponseDtoSchema>;
