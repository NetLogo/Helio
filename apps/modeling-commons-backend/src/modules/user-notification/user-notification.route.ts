import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  notificationPreferenceResponseDtoSchema,
  type NotificationPreferenceResponseDto,
} from '#src/modules/user-notification/preferences/dtos/notification-preference.response.dto.ts';
import {
  updateNotificationPreferencesRequestDtoSchema,
  type UpdateNotificationPreferencesRequestDto,
} from '#src/modules/user-notification/preferences/dtos/update-notification-preferences.request.dto.ts';
import { listUserNotificationsQueryDtoSchema } from '#src/modules/user-notification/feed/dtos/user-notifications.request.dto.ts';
import { userNotificationPaginatedResponseSchema } from '#src/modules/user-notification/feed/dtos/user-notification.paginated.response.dto.ts';
import { notificationUnsubscribeQueryDtoSchema } from '#src/modules/user-notification/preferences/dtos/notification-unsubscribe.request.dto.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export default async function userNotificationRoutes(fastify: FastifyInstance) {
  const {
    listNotificationsQuery,
    feedService,
    notificationPreferencesService,
    notificationPreferenceUpdateService,
  } = fastify.diContainer.cradle;

  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, _body, done) => {
      done(null, undefined);
    },
  );

  fastify.get(
    '/v1/me/notification-preferences',
    {
      schema: {
        response: { 200: notificationPreferenceResponseDtoSchema },
        tags: ['UserNotification'],
      },
      preHandler: [requireAuth],
    },
    async (request): Promise<NotificationPreferenceResponseDto> => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return notificationPreferencesService.getPreferences(request.user!.id);
    },
  );

  fastify.patch<{ Body: UpdateNotificationPreferencesRequestDto }>(
    '/v1/me/notification-preferences',
    {
      schema: {
        body: updateNotificationPreferencesRequestDtoSchema,
        tags: ['UserNotification'],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await notificationPreferenceUpdateService.updatePreferences(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        request.user!.id,
        request.body.preferences,
      );
      return reply.code(204).send();
    },
  );

  fastify.withTypeProvider<TypeBoxTypeProvider>().get(
    '/v1/me/notifications',
    {
      schema: {
        querystring: listUserNotificationsQueryDtoSchema,
        response: { 200: userNotificationPaginatedResponseSchema },
        tags: ['UserNotification'],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return listNotificationsQuery.execute(request.user!.id, request.query);
    },
  );

  fastify.withTypeProvider<TypeBoxTypeProvider>().patch(
    '/v1/me/notifications/:id/read',
    {
      schema: {
        params: idDtoSchema,
        tags: ['UserNotification'],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await feedService.markRead(request.user!.id, request.params.id);
      return reply.code(204).send();
    },
  );

  fastify.withTypeProvider<TypeBoxTypeProvider>().post(
    '/v1/notification-unsubscribe',
    {
      schema: {
        querystring: notificationUnsubscribeQueryDtoSchema,
        tags: ['UserNotification'],
      },
    },
    async (request, reply) => {
      await notificationPreferencesService.unsubscribe(request.query.token);
      return reply.code(204).send();
    },
  );
}
