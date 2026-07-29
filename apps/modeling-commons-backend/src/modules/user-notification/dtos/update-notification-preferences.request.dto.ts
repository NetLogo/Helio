import { Type, type Static } from 'typebox';

export const updateNotificationPreferencesRequestDtoSchema = Type.Object({
  preferences: Type.Array(
    Type.Object({
      category: Type.String(),
      email: Type.Optional(Type.Boolean()),
      inApp: Type.Optional(Type.Boolean()),
    }),
    { minItems: 1 },
  ),
});

export type UpdateNotificationPreferencesRequestDto = Static<
  typeof updateNotificationPreferencesRequestDtoSchema
>;
