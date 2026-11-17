import { Type, type Static } from 'typebox';
import { notificationCategories } from '#src/modules/notification-catalog.ts';
import { EmailMode } from '#prisma/index';
import { enumSchema } from '#src/shared/schemas/enum-from-prisma.ts';

export const updateNotificationPreferencesRequestDtoSchema = Type.Object({
  preferences: Type.Array(
    Type.Object({
      category: Type.Enum(notificationCategories),
      email: Type.Optional(enumSchema(EmailMode)),
      inApp: Type.Optional(Type.Boolean()),
    }),
    { minItems: 1 },
  ),
});

export type UpdateNotificationPreferencesRequestDto = Static<
  typeof updateNotificationPreferencesRequestDtoSchema
>;
