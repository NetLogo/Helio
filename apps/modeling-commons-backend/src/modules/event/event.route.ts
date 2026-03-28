import { requireAuth } from '#src/shared/hooks/require-auth.ts';
import { requireRole } from '#src/shared/hooks/require-role.ts';
import type { FastifyInstance } from 'fastify';
import {
  eventAdminQuerySchema,
  type EventAdminQuery,
} from '#src/modules/event/event.schemas.ts';
import { eventPaginatedResponseSchema } from '#src/modules/event/dtos/event.paginated.response.dto.ts';

export default async function eventRoutes(fastify: FastifyInstance) {
  const { listEventsQuery, eventMapper } = fastify.diContainer.cradle;

  fastify.get<{ Querystring: EventAdminQuery }>(
    '/v1/admin/events',
    {
      schema: {
        querystring: eventAdminQuerySchema,
        response: { 200: eventPaginatedResponseSchema },
      },
      preHandler: [requireAuth, requireRole('admin')],
    },
    async (request) => {
      const { limit, page, ...filters } = request.query;
      const result = await listEventsQuery.execute(filters, { limit, page });
      return {
        ...result,
        data: result.data.map((r) => eventMapper.toResponse(eventMapper.toDomain(r))),
      };
    },
  );
}
