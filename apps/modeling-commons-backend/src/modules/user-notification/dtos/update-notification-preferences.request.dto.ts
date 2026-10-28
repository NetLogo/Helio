import { Type, type Static } from 'typebox';
import { EmailMode } from '#src/modules/user-notification/domain/user-notification.types.ts';
import { enumSchema } from '#src/shared/schemas/enum-from-prisma.ts';

export const updateNotificationPreferencesRequestDtoSchema = Type.Object({
  preferences: Type.Array(
    Type.Object({
      category: Type.String(),
      email: Type.Optional(enumSchema(EmailMode)),
      inApp: Type.Optional(Type.Boolean()),
    }),
    { minItems: 1 },
  ),
});

export type UpdateNotificationPreferencesRequestDto = Static<
  typeof updateNotificationPreferencesRequestDtoSchema
>;
