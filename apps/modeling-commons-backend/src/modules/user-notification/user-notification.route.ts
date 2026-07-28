import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
  notificationPreferenceResponseDtoSchema,
  type NotificationPreferenceResponseDto,
} from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';
import {
  updateNotificationPreferencesRequestDtoSchema,
  type UpdateNotificationPreferencesRequestDto,
} from '#src/modules/user-notification/dtos/update-notification-preferences.request.dto.ts';
import { listUserNotificationsQueryDtoSchema } from '#src/modules/user-notification/dtos/user-notifications.request.dto.ts';
import { userNotificationPaginatedResponseSchema } from '#src/modules/user-notification/dtos/user-notification.paginated.response.dto.ts';
import { idDtoSchema } from '#src/shared/api/id.response.dto.ts';

export default async function userNotificationRoutes(fastify: FastifyInstance) {
  const { getNotificationPreferencesQuery, listUserNotificationsQuery, userNotificationService } =
    fastify.diContainer.cradle;

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
      return getNotificationPreferencesQuery.execute(request.user!.id);
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await userNotificationService.updatePreferences(request.user!.id, request.body.preferences);
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
      return listUserNotificationsQuery.execute(request.user!.id, request.query);
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
      await userNotificationService.markRead(request.user!.id, request.params.id);
      return reply.code(204).send();
    },
  );
}
