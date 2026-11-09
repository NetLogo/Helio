import { Type, type Static } from 'typebox';
import { NOTIFICATION_CATEGORIES } from '#src/modules/notification-producers.ts';
import { EmailMode } from '#src/modules/user-notification/domain/user-notification.types.ts';
import { enumSchema } from '#src/shared/schemas/enum-from-prisma.ts';

export const categoryPreferenceDtoSchema = Type.Object({
  category: Type.Enum(NOTIFICATION_CATEGORIES),
  label: Type.String(),
  description: Type.String(),
  email: enumSchema(EmailMode),
  inApp: Type.Boolean(),
});

export type CategoryPreferenceDto = Static<typeof categoryPreferenceDtoSchema>;

export const notificationPreferenceResponseDtoSchema = Type.Object({
  categories: Type.Array(categoryPreferenceDtoSchema),
});

export type NotificationPreferenceResponseDto = Static<
  typeof notificationPreferenceResponseDtoSchema
>;
