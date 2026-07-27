import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import type { FastifyInstance } from 'fastify';
import {
  notificationPreferenceResponseDtoSchema,
  type NotificationPreferenceResponseDto,
} from '#src/modules/user-notification/dtos/notification-preference.response.dto.ts';
import {
  updateNotificationPreferencesRequestDtoSchema,
  type UpdateNotificationPreferencesRequestDto,
} from '#src/modules/user-notification/dtos/update-notification-preferences.request.dto.ts';

export default async function userNotificationRoutes(fastify: FastifyInstance) {
  const { getNotificationPreferencesQuery, userNotificationService } = fastify.diContainer.cradle;

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
}
