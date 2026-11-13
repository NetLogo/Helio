import { Type, type Static } from 'typebox';
import { idSchema } from '#src/shared/utils/id.ts';

import { notificationCategories } from '#src/modules/notification-catalog.ts';

const notificationPreviewSchema = Type.Object({
  name: Type.Union([Type.String(), Type.Null()]),
  thumbnailUrl: Type.Union([Type.String(), Type.Null()]),
  url: Type.String({ format: 'uri' }),
});

export const userNotificationResponseDtoSchema = Type.Object({
  id: idSchema(),
  category: Type.Enum(notificationCategories),
  title: Type.String(),
  body: Type.String(),
  url: Type.String({ format: 'uri' }),
  actor: Type.Union([notificationPreviewSchema, Type.Null()]),
  target: Type.Union([notificationPreviewSchema, Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export type UserNotificationResponseDto = Static<typeof userNotificationResponseDtoSchema>;
