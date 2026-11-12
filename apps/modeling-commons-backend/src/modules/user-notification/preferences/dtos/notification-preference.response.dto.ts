import { Type, type Static } from 'typebox';
import { notificationCategories } from '#src/modules/notification-catalog.ts';
import { EmailMode } from '#prisma/index';
import { enumSchema } from '#src/shared/schemas/enum-from-prisma.ts';

export const categoryPreferenceDtoSchema = Type.Object({
  category: Type.Enum(notificationCategories),
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
