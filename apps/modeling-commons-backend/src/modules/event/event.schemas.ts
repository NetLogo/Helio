import { Type, type Static } from 'typebox';
import { paginatedQueryRequestDtoSchema } from '#src/shared/api/paginated-query.request.dto.ts';

export const eventAdminQuerySchema = Type.Intersect([
  paginatedQueryRequestDtoSchema,
  Type.Object({
    type: Type.Optional(Type.String({ description: 'Filter by event type' })),
    resourceType: Type.Optional(Type.String({ description: 'Filter by resource type' })),
  }),
]);
export type EventAdminQuery = Static<typeof eventAdminQuerySchema>;
