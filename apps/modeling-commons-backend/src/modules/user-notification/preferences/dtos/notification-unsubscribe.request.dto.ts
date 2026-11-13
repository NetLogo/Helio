import { Type, type Static } from 'typebox';

export const notificationUnsubscribeQueryDtoSchema = Type.Object({
  token: Type.String({
    minLength: 1,
    description: 'Signed unsubscribe token from a notification email',
  }),
});

export type NotificationUnsubscribeQueryDto = Static<typeof notificationUnsubscribeQueryDtoSchema>;
