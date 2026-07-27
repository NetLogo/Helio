import { Type, type Static } from 'typebox';

export const categoryPreferenceDtoSchema = Type.Object({
  category: Type.String(),
  label: Type.String(),
  description: Type.String(),
  email: Type.Boolean(),
  inApp: Type.Boolean(),
});

export type CategoryPreferenceDto = Static<typeof categoryPreferenceDtoSchema>;

export const notificationPreferenceResponseDtoSchema = Type.Object({
  categories: Type.Array(categoryPreferenceDtoSchema),
});

export type NotificationPreferenceResponseDto = Static<
  typeof notificationPreferenceResponseDtoSchema
>;
